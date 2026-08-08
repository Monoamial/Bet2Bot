"""Runs a match of many hands between a fixed set of bots."""

import heapq
import random
from typing import Dict, List, Optional

from poker.engine import BotFn, GameConfig, play_hand, resolve_hook
from poker.state import HandSummary
from poker.stats import Stats


def run_match(
    bots: Dict[str, BotFn],
    hands: int,
    config: Optional[GameConfig] = None,
    seed: Optional[int] = None,
    log: bool = False,
    capture_events: int = 0,
    curate: int = 0,
) -> Stats:
    """Play `hands` hands between the given bots and return collected Stats.

    Each bot keeps a fixed seat; the dealer button advances by one every hand, so
    over a full rotation each bot plays every position equally. A fresh, seeded deck
    is shuffled per hand for reproducibility.

    `bots` maps a display name to either a function `act(state) -> action` or a
    stateful bot object (an instance with an `act` method and an optional
    `on_hand_end(summary)` hook). Both styles can share one match.

    Replay capture — two independent modes:
      * `capture_events=N` records the first N hands into `stats.replays`.
      * `curate=K` records every hand and keeps the K biggest wins and K biggest
        losses *for seat 0* (the player) in `stats.curated`, each as a dict
        `{"kind": "win"|"loss", "hand": <index>, "net": <chips>, "events": [...]}`,
        ordered biggest win first, then biggest loss first. Memory stays bounded:
        only the current top-K candidates' event streams are retained.
    """
    if len(bots) < 2:
        raise ValueError("need at least 2 bots")
    config = config or GameConfig()
    rng = random.Random(seed)

    names: List[str] = list(bots.keys())
    seats: List[BotFn] = [bots[nm] for nm in names]
    n = len(seats)

    # Collect learning hooks for stateful bots (functions have none).
    hooks = [resolve_hook(b) for b in seats]

    stats = Stats(names, big_blind=config.big_blind)

    # Running top-K heaps for curated replays (min-heaps keyed so the *least*
    # interesting candidate sits at the root and gets evicted first). The hand
    # index breaks net ties so the event lists are never compared.
    top_wins: List[tuple] = []    # (net, hand, events) — smallest win at root
    top_losses: List[tuple] = []  # (-net, hand, events) — mildest loss at root

    for h in range(hands):
        button = h % n
        record = h < capture_events or curate > 0
        result = play_hand(seats, button, config, rng=rng, log=log,
                           record_events=record)
        stats.record(result)
        if h < capture_events:
            stats.replays.append(result.events)

        if curate > 0:
            net0 = result.net[0]
            if net0 > 0:
                heapq.heappush(top_wins, (net0, h, result.events))
                if len(top_wins) > curate:
                    heapq.heappop(top_wins)
            elif net0 < 0:
                heapq.heappush(top_losses, (-net0, h, result.events))
                if len(top_losses) > curate:
                    heapq.heappop(top_losses)

        if any(hooks):
            summary = HandSummary(
                button=button,
                num_players=n,
                board=result.board,
                betting_history=result.betting_history,
                net=result.net,
                winners=result.winners,
                showdown_seats=result.showdown_seats,
                revealed=result.revealed,
            )
            for hook in hooks:
                if hook is not None:
                    try:
                        hook(summary)
                    except Exception:
                        pass  # a buggy learning hook must not break the match

        if log:
            print(f"--- Hand {h} (button=seat {button}) ---")
            print("\n".join(result.log))

    for net, hand, events in sorted(top_wins, reverse=True):
        stats.curated.append(
            {"kind": "win", "hand": hand, "net": net, "events": events})
    for neg_net, hand, events in sorted(top_losses, reverse=True):
        stats.curated.append(
            {"kind": "loss", "hand": hand, "net": -neg_net, "events": events})

    return stats
