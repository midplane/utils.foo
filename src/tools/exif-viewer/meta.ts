import { ToolMeta } from '../types'
import { ImageIcon } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'exif-viewer',
  name: 'EXIF Viewer',
  description: 'View EXIF metadata from JPEG and TIFF images — camera, GPS, settings & more',
  category: 'Data & Visualization',
  keywords: ['exif', 'image', 'metadata', 'photo', 'camera', 'gps', 'jpeg', 'jpg', 'tiff', 'orientation', 'lens', 'aperture', 'iso', 'shutter'],
  path: '/exif',
  icon: ImageIcon,
}
