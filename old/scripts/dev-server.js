const browserSync = require('browser-sync').create();
const { spawn } = require('child_process');

// Start browser-sync
browserSync.init({
    server: './dist',
    port: 3000,
    ui: false,
    open: false,
    notify: false
});

// Watch for changes in public directory
browserSync.watch('dist/**/*').on('change', browserSync.reload);

// Run build on start
console.log('Initial build...');
const build = spawn('node', ['scripts/build.js'], { stdio: 'inherit' });

// Start nodemon to watch source files and rebuild
const nodemon = spawn('npx', ['nodemon', '--config', 'config/nodemon.json'], { stdio: 'inherit' });

// Handle exit
process.on('SIGINT', () => {
    nodemon.kill();
    process.exit();
});
