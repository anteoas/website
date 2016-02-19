module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // Minify scripts
        uglify: {
            build: {
                options: {
                    sourceMap: true
                },
                files: {
                  'js/core.min.js': ['js/core.js']
                }
            }
        },    
        // Compile & minify SASS
        sass: {
            dist: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'css/style.min.css': 'scss/style.scss',
                }
            } 
        }, 
        // Watch for changes and run tasks on change
        watch: {
            options: {
                livereload: true
            },            
            scripts: {
                files: ['js/*.js'],
                tasks: ['uglify'],
                options: {
                    spawn: false
                }
            },
            css: {
                files: ['scss/*.scss'],
                tasks: ['sass'],
                options: {
                    spawn: false
                }
            }             
        }                          

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['uglify', 'sass', 'watch']);

};