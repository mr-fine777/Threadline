import json
def handler(request, response):
    # Example Vercel Python handler for template creation
    if request.method != "POST":
        response.status_code = 405
        response.body = json.dumps({"error": "Method not allowed"})
        response.headers["Content-Type"] = "application/json"
        return response
    # Implement your template creation logic here
    response.status_code = 200
    response.body = json.dumps({"message": "Template created successfully"})
    response.headers["Content-Type"] = "application/json"
    return response

if __name__ == "__main__":
    print("This script is intended to be run as a Vercel function.")
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
