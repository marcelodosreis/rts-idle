# Authoritative Match Bootstrap

## Objective and motivation

Establish a single server-authoritative match configuration so a browser never
selects gameplay content independently of the running simulation.

## Contract

After opening a socket, a client sends exactly one `match_request`. It names a
server scenario and either requests the server catalog map or supplies a local
map definition. The server validates and normalizes every untrusted request,
validates scenario entities against that map, derives the rules identity and
creates the session. It then sends `match_config`; snapshots begin only after
that message.

`match_config` contains the selected scenario summary, server scenario catalog,
normalized map, and construction catalog. Command messages are accepted only
after bootstrap. Invalid, missing, or duplicate requests return an error and
never start a timer.

## Boundaries and constraints

Protocol owns the wire contract; shared owns structural map normalization;
game-data owns server content and semantic catalog validation; server owns
admission and session creation. The web renders only `match_config` content.
Map dimensions and every structural coordinate are bounded before use. Rules
identity includes the normalized map content. Commands, snapshots, and state
remain deterministic.

## User surface and migration

The match screen sends query-selected scenario/aggression plus an optional
editor map in its initial request, waits for configuration, and then mounts its
renderer using that configuration. Scenario choices and build actions use the
returned catalogs. Legacy raw MOVE transport and pre-bootstrap snapshots are
removed in protocol version 0.6.0.

## Non-goals

This does not add rooms, multiplayer assignment, production, pathfinding, or
server persistence.

## Acceptance and validation

Contract tests cover malformed/duplicate bootstrap requests and map guards;
integration tests cover no timer before bootstrap and non-32x32 local maps;
simulation tests cover bounds, restore, and deterministic hashes. Browser
coverage exercises the configured match screen. Completion runs `verify`, the
Chromium browser gate, and the postmortem status generator.
