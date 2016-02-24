module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // Compile & minify SASS
        sass: {
            dist: {
                options: {
                    style: 'expanded'
                },
                files: {
                    'css/style.css': 'scss/style.scss',
                }
            } 
        },
        // Minify CSS
		cssmin: {
			options: {
				sourceMap: true
			},
			target: {
				files: [{
					expand: true,
					cwd: 'css',
					src: ['*.css', '!*.min.css'],
					dest: 'css',
					ext: '.min.css'
				}]
			}
		},
        // Uglify scripts
        uglify: {
            build: {
                options: {
                    sourceMap: true
                },
                files: {
                  'js/core.min.js': ['js/core.js'],
                  'js/fittext.min.js': ['js/fittext.js']
                }
            }
        },    
        // Watch for changes and run tasks on change
        watch: {
            options: {
                livereload: true
            },            
            scripts: {
                files: ['js/*.js', 'css/*.css'],
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
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['sass', 'cssmin', 'uglify', 'watch']);

};