import struct, zlib

def create_png(width, height, output_path):
    """Create a simple robot cat face PNG icon."""
    
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    # IDAT - create image data
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            cx, cy = width // 2, height // 2
            # Background - dark
            pr, pg, pb = 0x0d, 0x11, 0x17
            
            # Eyes (two bright blue ellipses)
            eye_rx = width // 5
            eye_ry = height // 6
            eye_spacing = width // 4
            
            # Left eye
            dx1 = (x - (cx - eye_spacing)) / eye_rx
            dy1 = (y - (cy - height // 10)) / eye_ry
            if dx1*dx1 + dy1*dy1 < 1.0:
                pr, pg, pb = 0x58, 0xa6, 0xff
            
            # Right eye
            dx2 = (x - (cx + eye_spacing)) / eye_rx
            dy2 = (y - (cy - height // 10)) / eye_ry
            if dx2*dx2 + dy2*dy2 < 1.0:
                pr, pg, pb = 0x58, 0xa6, 0xff
            
            # Pupils
            pupil_rx = width // 15
            pupil_ry = height // 15
            pdx1 = (x - (cx - eye_spacing)) / pupil_rx
            pdy1 = (y - (cy - height // 10)) / pupil_ry
            if pdx1*pdx1 + pdy1*pdy1 < 1.0:
                pr, pg, pb = 0x0d, 0x11, 0x17
            
            pdx2 = (x - (cx + eye_spacing)) / pupil_rx
            pdy2 = (y - (cy - height // 10)) / pupil_ry
            if pdx2*pdx2 + pdy2*pdy2 < 1.0:
                pr, pg, pb = 0x0d, 0x11, 0x17
            
            # Mouth (small smile)
            mouth_y = cy + height // 5
            if abs(y - mouth_y) < max(2, height // 60) and abs(x - cx) < width // 6:
                pr, pg, pb = 0x58, 0xa6, 0xff
            
            # Ears (triangles at top)
            ear_w = width // 6
            ear_h = height // 4
            ear_top = height // 10
            # Left ear
            if ear_top < y < ear_top + ear_h:
                progress = (y - ear_top) / ear_h
                ear_half_w = ear_w * (1 - progress)
                ear_cx = cx - width // 3
                if abs(x - ear_cx) < ear_half_w:
                    pr, pg, pb = 0x21, 0x26, 0x2d
            # Right ear
            if ear_top < y < ear_top + ear_h:
                progress = (y - ear_top) / ear_h
                ear_half_w = ear_w * (1 - progress)
                ear_cx = cx + width // 3
                if abs(x - ear_cx) < ear_half_w:
                    pr, pg, pb = 0x21, 0x26, 0x2d
            
            raw_data += bytes([pr, pg, pb])
    
    compressed = zlib.compress(raw_data)
    idat = make_chunk(b'IDAT', compressed)
    
    # IEND
    iend = make_chunk(b'IEND', b'')
    
    with open(output_path, 'wb') as f:
        f.write(signature + ihdr + idat + iend)
    print(f'Created {output_path} ({width}x{height})')

create_png(192, 192, 'C:/Users/Ruslan/robot-catty/server/public/icons/icon-192.png')
create_png(512, 512, 'C:/Users/Ruslan/robot-catty/server/public/icons/icon-512.png')
