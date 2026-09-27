import { atmosphere, board, lighting, noUpdate, type ArenaTheme } from './kit'

export const neutral: ArenaTheme = {
  id: 'neutral',
  label: 'Training Ground',
  build: (scene, root) => {
    atmosphere(scene, root, '#0b1020', '#141a2b', 16, 34)
    lighting(root, { sky: '#bcd4ff', ground: '#2a2036', sun: '#fff1dc' })
    board(root, { near: '#34496a', far: '#5a3d4c', base: '#2b3148' })
    return noUpdate
  },
}
