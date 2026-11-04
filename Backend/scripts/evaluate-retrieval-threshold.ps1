param(
    [Parameter(Mandatory=$true)][string]$ResultsDir,
    [string]$OutputPath = "$PSScriptRoot\..\docs\RETRIEVAL_THRESHOLD_EVALUATION.json"
)

$ErrorActionPreference = 'Stop'
$thresholds = @(0.60, 0.58, 0.56, 0.55)
$rows = @()
foreach ($file in Get-ChildItem -LiteralPath $ResultsDir -Filter '*raw.jsonl') {
    foreach ($line in Get-Content -LiteralPath $file.FullName) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $rows += $line | ConvertFrom-Json
    }
}
$unique = @{}
foreach ($row in $rows) {
    if (-not $unique.ContainsKey($row.id)) { $unique[$row.id] = $row }
}

$labels = @{
    'WIS-01' = @{ type='source_required'; expected=@(@{source_type='destination'; label='*'}) }
    'WIS-02' = @{ type='source_required'; expected=@(@{source_type='culture'; label='Candi Jawi'}, @{source_type='destination'; label='Candi Jawi'}) }
    'WIS-03' = @{ type='source_required'; expected=@(@{source_type='culture'; label='Candi Jawi'}, @{source_type='destination'; label='Candi Jawi'}) }
    'WIS-06' = @{ type='source_required'; expected=@(@{source_type='destination'; label='*'}) }
    'KUL-01' = @{ type='source_required'; expected=@(@{source_type='culinary'; label='*'}) }
    'KUL-02' = @{ type='source_required'; expected=@(@{source_type='culinary'; label='Nasi Punel Bu Hj. Lin'}) }
    'KUL-06' = @{ type='source_required'; expected=@(@{source_type='culinary'; label='Nasi Punel Bu Hj. Lin'}) }
    'BUD-02' = @{ type='source_required'; expected=@(@{source_type='culture'; label='Candi Jawi'}, @{source_type='destination'; label='Candi Jawi'}) }
    'EVT-01' = @{ type='source_required'; expected=@(@{source_type='event'; label='*'}) }
    'EVT-05' = @{ type='source_required'; expected=@(@{source_type='event'; label='*'}) }
    'UMM-02' = @{ type='source_required'; expected=@(@{source_type='region'; label='*'}) }
}

$reports = @()
foreach ($threshold in $thresholds) {
    $accepted = 0
    $truePositive = 0
    $falsePositive = 0
    $expectedFound = 0
    $expectedTotal = 0
    $details = @()
    foreach ($id in $labels.Keys) {
        if (-not $unique.ContainsKey($id)) { continue }
        $label = $labels[$id]
        $expectedTotal += @($label.expected).Count
        $row = $unique[$id]
        $candidates = @($row.retrieval_candidates)
        foreach ($candidate in $candidates) {
            if ($null -eq $candidate.similarity -or [double]$candidate.similarity -lt $threshold) { continue }
            $accepted++
            $isMatch = @($label.expected | Where-Object { [string]$_.source_type -eq [string]$candidate.source_type -and ($_.label -eq '*' -or [string]$_.label -eq [string]$candidate.source_label) })
            if ($isMatch.Count -gt 0) { $truePositive++ } else { $falsePositive++ }
        }
        foreach ($expected in @($label.expected)) {
            $hasExpected = @($candidates | Where-Object { [string]$_.source_type -eq [string]$expected.source_type -and ($expected.label -eq '*' -or [string]$_.source_label -eq [string]$expected.label) -and [double]$_.similarity -ge $threshold })
            if ($hasExpected.Count -gt 0) { $expectedFound++ }
        }
        $details += [pscustomobject]@{ scenario_id=$id; threshold=$threshold; expected_source=(@($label.expected | ForEach-Object {$_.label}) -join '; '); expected_found=$expectedFound; accepted_candidates=$(@($candidates | Where-Object {[double]$_.similarity -ge $threshold})).Count }
    }
    $precision = if ($accepted -gt 0) { $truePositive / $accepted } else { 0 }
    $recall = if ($expectedTotal -gt 0) { $expectedFound / $expectedTotal } else { 0 }
    $reports += [pscustomobject]@{ threshold=$threshold; precision=$precision; recall=$recall; true_positive=$truePositive; false_positive=$falsePositive; expected_sources=$expectedTotal; expected_sources_found=$expectedFound; details=$details }
}
$reports | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
$reports | Select-Object threshold,precision,recall,true_positive,false_positive,expected_sources_found,expected_sources
