# Public Assets

## PWA Icons

The manifest.json references the following icon sizes that need to be generated:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### Generating Icons

You can use the `favicon.svg` as the source and generate all required sizes using:

1. **Online Tools:**
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator

2. **CLI Tools:**
   ```bash
   # Using ImageMagick
   for size in 72 96 128 144 152 192 384 512; do
     convert favicon.svg -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

3. **Design Tools:**
   - Export from Figma, Sketch, or Adobe Illustrator
   - Use the construction orange (#ea580c) as the primary brand color
   - Include the house icon design from favicon.svg

## Screenshots

The manifest also references:
- screenshot-wide.png (1280x720) - Desktop view
- screenshot-narrow.png (750x1334) - Mobile view

These should show the actual application interface for app store listings.

## Current Status

✅ manifest.json - Complete
✅ favicon.svg - Placeholder (replace with final design)
✅ robots.txt - Complete
⚠️  PNG icons - Need to be generated
⚠️  Screenshots - Need to be captured from running app
