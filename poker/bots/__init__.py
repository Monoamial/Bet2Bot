"""Example bots students can study and copy."""

from poker.bots.examples import (
    caller,
    folder,
    maniac,
    position_aware,
    pot_odds_caller,
    random_bot,
    rock,
    tight_aggressive,
)
from poker.bots.archetypes import over_folder, river_bluffer, trapper
from poker.bots.stateful import ProfilingBot

__all__ = [
    "caller",
    "folder",
    "maniac",
    "position_aware",
    "pot_odds_caller",
    "random_bot",
    "rock",
    "tight_aggressive",
    "river_bluffer",
    "over_folder",
    "trapper",
    "ProfilingBot",
]
