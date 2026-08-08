"""Interactive (human-in-the-seat) play, driving the same engine as the bots.

`InteractiveMatch` plays a continuous heads-up match: the human sits in seat 0, a chosen
bot in seat 1, the button rotates each hand, and the human's running net is tracked. It
drives `play_hand_gen` (poker/engine.py), auto-answering the opponent's turns and pausing
whenever the human must act. Events are streamed as they happen so the UI can animate the
opponent's moves before presenting the human's options.

The opponent's hole cards are never streamed live (only the human's own) — they appear
only via the showdown event if the hand gets there, just like real poker.
"""

from typing import List, Optional

from poker.engine import GameConfig, play_hand_gen, resolve_act
from poker.state import GameState

HUMAN = 0
OPP = 1


class InteractiveMatch:
    def __init__(self, opponent, config: Optional[GameConfig] = None, seed: Optional[int] = None,
                 fixed_button: Optional[int] = None):
        """`fixed_button` pins the dealer button to one seat for every hand (used by
        Academy position drills: button==human -> always in position postflop, and
        vice versa). Default None keeps the normal per-hand rotation."""
        import random
        self.opponent = opponent
        self.opp_act = resolve_act(opponent)
        self.config = config or GameConfig()
        self.rng = random.Random(seed)
        self.fixed_button = fixed_button
        self.button = fixed_button if fixed_button is not None else 0
        self.net = [0, 0]
        self.hands_played = 0
        self._gen = None
        self._live: List[dict] = []
        self._consumed = 0
        self._pending: Optional[GameState] = None
        self._done: Optional[dict] = None

    # --- generator plumbing ---
    def _start_gen(self):
        try:
            return next(self._gen)
        except StopIteration as e:
            self._finish(e.value)
            return None

    def _send(self, value):
        try:
            return self._gen.send(value)
        except StopIteration as e:
            self._finish(e.value)
            return None

    def _auto_opponent(self, state: Optional[GameState]) -> Optional[GameState]:
        """Answer opponent turns until it's the human's turn (or the hand ends)."""
        while state is not None and state.my_seat != HUMAN:
            try:
                raw = self.opp_act(state)
            except Exception:
                raw = None
            explain = getattr(self.opponent, "last_decision", None)
            state = self._send((raw, explain))
        return state

    def _finish(self, result):
        self.hands_played += 1
        for s in range(2):
            self.net[s] += result.net[s]
        self._done = {
            "winners": list(result.winners),
            "handNet": result.net[HUMAN],
            "youWon": HUMAN in result.winners,
        }
        if self.fixed_button is None:
            self.button = (self.button + 1) % 2  # rotate for the next hand

    # --- public API (returns JSON-able payloads) ---
    def start_hand(self) -> dict:
        self._live = []
        self._consumed = 0
        self._done = None
        self._pending = None
        self._gen = play_hand_gen(2, self.button, self.config, self.rng,
                                  record_events=True, event_sink=self._live)
        state = self._start_gen()
        self._pending = self._auto_opponent(state)
        return self._payload()

    def act(self, action: str) -> dict:
        if self._pending is None or self._done is not None:
            return self._payload()
        state = self._send((action, None))
        self._pending = self._auto_opponent(state)
        return self._payload()

    def _pending_view(self) -> Optional[dict]:
        s = self._pending
        if s is None or self._done is not None:
            return None
        return {
            "legal": list(s.legal_actions),
            "toCall": s.to_call,
            "pot": s.pot,
            "street": s.street,
            "hole": [str(c) for c in s.hole_cards],
            "board": [str(c) for c in s.community_cards],
            "betSize": s.bet_size,
        }

    def _payload(self) -> dict:
        new = self._live[self._consumed:]
        self._consumed = len(self._live)
        # Hide the opponent's hole cards during live play (reveal only at showdown).
        live = [e for e in new if not (e["type"] == "hole" and e["seat"] != HUMAN)]
        return {
            "events": live,
            "pending": self._pending_view(),
            "done": self._done,
            "net": list(self.net),
            "handsPlayed": self.hands_played,
            "button": self.button,
            "humanSeat": HUMAN,
        }
