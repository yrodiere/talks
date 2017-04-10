module.exports = function(grunt) {
	var port = grunt.option('port') || 8000;

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		clean: {
			test: [ 'dist' ]
		},

		concat: {
			js: {
				src: [
					'node_modules/reveal.js/lib/js/head.min.js',
					'node_modules/reveal.js/js/reveal.js',
					'js/reveal-bootstrap.js'
				],
				dest: 'dist/js/reveal-bootstrap.js'
			}
		},

		sass: {
			core: {
				files: {
					'dist/css/main.css': 'css/main.scss'
				}
			},
			themes: {
				files: [
					{
						expand: true,
						cwd: 'css/theme/source',
						src: ['*.scss'],
						dest: 'dist/css/theme',
						ext: '.css'
					}
				]
			}
		},

		autoprefixer: {
			dist: {
				src: 'dist/css/main.css'
			}
		},

		copy: {
			js: {
				files: [
					{ expand: true, dest: 'dist/js/plugin/', cwd: 'node_modules/reveal.js/plugin/', src: '**' }
				],
			},
			css: {
				files: {
					'dist/css/reveal.css': 'node_modules/reveal.js/css/reveal.css',
					'dist/css/print/paper.css': 'node_modules/reveal.js/css/print/paper.css',
					'dist/css/print/pdf.css': 'node_modules/reveal.js/css/print/pdf.css',
					'dist/css/zenburn.css': 'node_modules/reveal.js/lib/css/zenburn.css'
				},
			},
			content: {
				files: [
					{ expand: true, dest: 'dist/', cwd: 'content', src: '**' },
					{ expand: true, dest: 'dist/', src: 'image/**' }
				]
			}
		},

		cssmin: {
			compress: {
				files: {
					'dist/css/main.min.css': [ 'dist/css/main.css' ]
				}
			}
		},

		jshint: {
			options: {
				curly: false,
				eqeqeq: true,
				immed: true,
				esnext: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				eqnull: true,
				browser: true,
				node: true,
				expr: true
			},
			files: [ 'Gruntfile.js', 'js/*.js' ]
		},

		exec: {
			generate_index: 'find content -name index.html -printf "%P\n" | xargs -n 1 dirname | xargs -n 1 -I {} printf "## [%s](%s)\n\n" {} {} > dist/index.md'
		},

		connect: {
			server: {
				options: {
					port: port,
					base: 'dist',
					livereload: true,
					open: true
				}
			}
		},

		'gh-pages': {
			options: {
				base: 'dist',
			},
			'gh-pages': {
				src: '**/*'
			}
		},

		watch: {
			'default': {
				files: [ 'Gruntfile.js' ],
				tasks: 'default'
			},
			js: {
				files: [ 'js/*.js' ],
				tasks: 'js'
			},
			theme: {
				files: [ 'css/theme/source/*.scss', 'css/theme/template/*.scss' ],
				tasks: 'css-themes'
			},
			css: {
				files: [ 'css/main.scss' ],
				tasks: 'css-core'
			},
			content: {
				files: [ 'content/**/*', 'image/**' ],
				tasks: 'content'
			},
			options: {
				livereload: true
			}
		}

	});

	// Dependencies
	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-concat' );
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-sass' );
	grunt.loadNpmTasks( 'grunt-contrib-connect' );
	grunt.loadNpmTasks( 'grunt-autoprefixer' );
	grunt.loadNpmTasks( 'grunt-gh-pages' );
	grunt.loadNpmTasks( 'grunt-exec' );

	// Default task
	grunt.registerTask( 'default', [ 'clean', 'css', 'js', 'content' ] );

	// JS task
	grunt.registerTask( 'js', [ 'jshint', 'copy:js', 'concat:js' ] );

	// Content
	grunt.registerTask( 'content', [ 'copy:content', 'exec:generate_index' ] );

	// CSS
	grunt.registerTask( 'css-themes', [ 'sass:themes' ] );
	grunt.registerTask( 'css-core', [ 'sass:core', 'copy:css', 'autoprefixer', 'cssmin' ] );
	grunt.registerTask( 'css', [ 'sass', 'copy:css', 'autoprefixer', 'cssmin' ] );


	// Serve presentation locally
	grunt.registerTask( 'serve', [ 'default', 'connect', 'watch' ] );

	// Publish to GitHub Pages
	grunt.registerTask( 'publish', [ 'default', 'gh-pages' ] );

};

