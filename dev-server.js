const browserSync = require('browser-sync').create();
const { spawn } = require('child_process');

// Start browser-sync
browserSync.init({
    server: './public',
    port: 3000,
    ui: false,
    open: false,
    notify: false
});

// Watch for changes in public directory
browserSync.watch('public/**/*').on('change', browserSync.reload);

// Run build on start
console.log('Initial build...');
const build = spawn('node', ['build.js'], { stdio: 'inherit' });

// Start nodemon to watch source files and rebuild
const nodemon = spawn('npx', ['nodemon'], { stdio: 'inherit' });

// Handle exit
process.on('SIGINT', () => {
    nodemon.kill();
    process.exit();
});
