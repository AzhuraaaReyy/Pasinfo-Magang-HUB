package utils

import "strings"

func SafeLogValue(value string) string {
	value = strings.ReplaceAll(value, "\r", "")
	value = strings.ReplaceAll(value, "\n", "")
	if len(value) > 200 {
		return value[:200] + "..."
	}
	return value
}
