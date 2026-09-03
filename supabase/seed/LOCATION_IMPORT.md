# Location import

The UI reads the `locations` table recursively. Import your preferred authoritative Nigeria state/LGA/city/area dataset into:

- `type = state`, parent = Nigeria
- `type = lga` or `city`, parent = state
- `type = area`, parent = city/LGA

No frontend changes are required. This lets the same pipeline cover Lagos, Abuja, Port Harcourt, Ibadan and every other territory you add.
