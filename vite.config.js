export default {
    root: '.',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5500
    },
    resolve: {
        alias: {
            'three': '/node_modules/three/build/three.module.js'
        }
    }
} 