# ARCHITECTURE – MASTERMove Capablanca (Club 8–12)

## Vue générale
Application Electron interne pour club d’échecs (8–12 ans).
Architecture locale sans backend externe.

### Couches
- Main (Electron)
- Renderer (UI + moteur JS maison)
- Content (JSON)
- Persistence locale

## Moteur
Garanties :
- Validation coups légaux
- Interdiction rois adjacents
- Interdiction laisser son roi en échec
- Validation FEN stricte

Objectif : moteur minimaliste mais fiable.