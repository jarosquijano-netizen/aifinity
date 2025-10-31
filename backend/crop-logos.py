#!/usr/bin/env python3
"""
Auto-crop logo images to remove white space
Requires: PIL/Pillow
"""

import os
from PIL import Image
import sys

def crop_logo(input_path, output_path):
    """Crop logo by removing white/transparent edges"""
    try:
        print(f"\nProcessing: {os.path.basename(input_path)}")
        
        # Open image
        img = Image.open(input_path)
        original_size = img.size
        print(f"   Original size: {original_size[0]}x{original_size[1]}")
        
        # Convert to RGBA if not already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Get bounding box (trim transparent/white edges)
        # Try getbbox first
        bbox = img.getbbox()
        
        # If getbbox doesn't work well, try manual detection
        if not bbox or bbox == (0, 0, img.size[0], img.size[1]):
            # Manual detection: find non-white/transparent areas
            width, height = img.size
            pixels = img.load()
            
            # Find top
            top = 0
            for y in range(height):
                for x in range(width):
                    r, g, b, a = pixels[x, y]
                    if not (r > 240 and g > 240 and b > 240) and a > 10:
                        top = y
                        break
                if top > 0:
                    break
            
            # Find bottom
            bottom = height
            for y in range(height - 1, -1, -1):
                for x in range(width):
                    r, g, b, a = pixels[x, y]
                    if not (r > 240 and g > 240 and b > 240) and a > 10:
                        bottom = y + 1
                        break
                if bottom < height:
                    break
            
            # Find left
            left = 0
            for x in range(width):
                for y in range(height):
                    r, g, b, a = pixels[x, y]
                    if not (r > 240 and g > 240 and b > 240) and a > 10:
                        left = x
                        break
                if left > 0:
                    break
            
            # Find right
            right = width
            for x in range(width - 1, -1, -1):
                for y in range(height):
                    r, g, b, a = pixels[x, y]
                    if not (r > 240 and g > 240 and b > 240) and a > 10:
                        right = x + 1
                        break
                if right < width:
                    break
            
            bbox = (left, top, right, bottom)
        
        if bbox:
            # Crop to bounding box
            cropped = img.crop(bbox)
            cropped_size = cropped.size
            print(f"   Cropped size: {cropped_size[0]}x{cropped_size[1]}")
            
            # Add small padding (10px)
            final_img = Image.new('RGBA', 
                                (cropped_size[0] + 20, cropped_size[1] + 20),
                                (255, 255, 255, 0))
            final_img.paste(cropped, (10, 10), cropped)
            
            # Save
            final_img.save(output_path, 'PNG', optimize=True)
            
            # Get file sizes
            original_file_size = os.path.getsize(input_path)
            new_file_size = os.path.getsize(output_path)
            savings = ((original_file_size - new_file_size) / original_file_size * 100)
            
            print(f"   Saved: {os.path.basename(output_path)}")
            print(f"   Final size: {final_img.size[0]}x{final_img.size[1]}")
            print(f"   Size: {original_file_size/1024:.1f} KB -> {new_file_size/1024:.1f} KB ({savings:.1f}% reduction)")
            
            return True
        else:
            print(f"   Could not determine bounding box")
            return False
            
    except Exception as e:
        print(f"   Error: {str(e)}")
        return False

def main():
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, '..', 'frontend', 'public')
    
    logo_light = os.path.join(public_dir, 'aifinity-logo.png')
    logo_dark = os.path.join(public_dir, 'aifinity-logo-dark.png')
    
    print("Auto-cropping AiFinity logos...\n")
    
    # Check if files exist
    if not os.path.exists(logo_light):
        print(f"Logo light not found: {logo_light}")
        return
    
    if not os.path.exists(logo_dark):
        print(f"Logo dark not found: {logo_dark}")
        return
    
    # Create backup
    backup_dir = os.path.join(public_dir, 'logo-backup')
    os.makedirs(backup_dir, exist_ok=True)
    
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    
    import shutil
    shutil.copy2(logo_light, os.path.join(backup_dir, f'aifinity-logo-backup-{timestamp}.png'))
    shutil.copy2(logo_dark, os.path.join(backup_dir, f'aifinity-logo-dark-backup-{timestamp}.png'))
    print("Backups created\n")
    
    # Crop logos
    success1 = crop_logo(logo_light, logo_light)
    success2 = crop_logo(logo_dark, logo_dark)
    
    if success1 and success2:
        print("\nAll logos cropped successfully!")
        print(f"\nOriginal files backed up in: {backup_dir}")
    else:
        print("\nSome logos failed to crop")

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print("PIL/Pillow not installed. Install with: pip install Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {str(e)}")
        sys.exit(1)

