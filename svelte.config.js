import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    }),
    paths: {
      base: ''
    },
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'font-src': ['self', 'data:'],
        'img-src': ['self', 'data:', 'blob:'],
        'media-src': ['self', 'blob:'],
        'connect-src': ['self'],
        'frame-ancestors': ['self']
      }
    }
  }
};
