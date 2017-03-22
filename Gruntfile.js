module.exports = function(grunt) {
	var port = grunt.option('port') || 8000;
	var root = grunt.option('root') || '.';

	if (!Array.isArray(root)) root = [root];

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		sass: {
			core: {
				files: {
					'css/style.css': 'css/style.scss'
				}
			},
			themes: {
				files: [
					{
						expand: true,
						cwd: 'css/theme/source',
						src: ['*.scss'],
						dest: 'css/theme',
						ext: '.css'
					}
				]
			}
		},

		autoprefixer: {
			dist: {
				src: 'css/style.css'
			}
		},

		cssmin: {
			compress: {
				files: {
					'css/style.min.css': [ 'css/style.css' ]
				}
			}
		},

		connect: {
			server: {
				options: {
					port: port,
					base: root,
					livereload: true,
					open: true
				}
			}
		},

		watch: {
			theme: {
				files: [ 'css/theme/source/*.scss', 'css/theme/template/*.scss' ],
				tasks: 'css-themes'
			},
			css: {
				files: [ 'css/style.scss' ],
				tasks: 'css-core'
			},
			html: {
				files: root.map(path => path + '/*.html')
			},
			markdown: {
				files: root.map(path => path + '/markdown/*.md')
			},
			options: {
				livereload: true
			}
		}

	});

	// Dependencies
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-sass' );
	grunt.loadNpmTasks( 'grunt-contrib-connect' );
	grunt.loadNpmTasks( 'grunt-autoprefixer' );

	// Default task
	grunt.registerTask( 'default', [ 'css' ] );

	// Markdown
	grunt.registerTask( 'markdown', [ 'html' ] );

	// CSS
	grunt.registerTask( 'css-themes', [ 'sass:themes' ] );
	grunt.registerTask( 'css-core', [ 'sass:core', 'autoprefixer', 'cssmin' ] );
	grunt.registerTask( 'css', [ 'sass', 'autoprefixer', 'cssmin' ] );


	// Serve presentation locally
	grunt.registerTask( 'serve', [ 'connect', 'watch' ] );

};

