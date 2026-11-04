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
		runPeriodically(ctx, 30*time.Millisecond, 10*time.Millisecond, func() { runs.Add(1) })
		close(done)
	}()
	time.Sleep(15 * time.Millisecond)
	if runs.Load() != 0 {
		t.Fatal("ran before the first delay")
	}
	time.Sleep(60 * time.Millisecond)
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
