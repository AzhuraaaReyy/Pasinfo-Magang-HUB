package services

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestRunPeriodicallyWaitsFirstThenRepeatsUntilCanceled(t *testing.T) {
	var runs atomic.Int32
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		// Margins well above the Windows timer resolution (~15.6 ms): with a 30 ms first delay a 15 ms sleep sometimes
		// overslept it and the test failed (audit 2026-11-05).
		runPeriodically(ctx, 200*time.Millisecond, 20*time.Millisecond, func() { runs.Add(1) })
		close(done)
	}()
	time.Sleep(50 * time.Millisecond)
	if runs.Load() != 0 {
		t.Fatal("ran before the first delay")
	}
	time.Sleep(300 * time.Millisecond)
	if runs.Load() < 2 {
		t.Fatalf("runs = %d, want repeats after the first delay", runs.Load())
	}
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("did not stop after cancel")
	}
	stopped := runs.Load()
	time.Sleep(30 * time.Millisecond)
	if runs.Load() != stopped {
		t.Fatal("ran after cancel")
	}
}

// P1-2 (jobdesk 14 Nov): a panic in one run (e.g. parsing a news page) must not end the API process; the job is run
// again at its next turn. Without runRecovered this test binary exits with "panic: simulated parser panic".
func TestRunPeriodicallySurvivesAPanickingRun(t *testing.T) {
	var runs atomic.Int32
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go runPeriodically(ctx, 10*time.Millisecond, 20*time.Millisecond, func() {
		runs.Add(1)
		panic("simulated parser panic")
	})
	time.Sleep(300 * time.Millisecond)
	if runs.Load() < 2 {
		t.Fatalf("runs = %d, want the job to run again after a panic", runs.Load())
	}
}
