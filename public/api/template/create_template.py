"""Utility to generate placeholder Roblox clothing templates.

This script creates a transparent PNG that can be used as a placeholder
shirt/pants template during local development.
"""

from PIL import Image


def main() -> None:
    img = Image.new("RGBA", (585, 559), (0, 0, 0, 0))
    img.save("src/assets/shirt_template.png")


if __name__ == "__main__":
    main()
from PIL import Image

# Create a transparent image with the correct dimensions for Roblox shirt template
img = Image.new('RGBA', (585, 559), (0, 0, 0, 0))
img.save('src/assets/shirt_template.png')