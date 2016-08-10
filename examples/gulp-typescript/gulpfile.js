const gulp = require('gulp');
const ts = require('gulp-typescript');
const paeckchen = require('gulp-paeckchen').paeckchen;
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

const sources = 'src/**/*.ts';
const tsProject = ts.createProject('tsconfig.json');

const bundler = paeckchen({
  // This is already transpiled by typescript, therefore its main.js
  entryPoint: 'main.js',
  // We should specifiy this, otherwise the first (maybe random) file give to gulp will name it
  outputFile: 'main.js',
  logLevel: 'debug'
});

gulp.task('build', () => {
  return gulp.src(sources)
    .pipe(sourcemaps.init())
    .pipe(ts(tsProject))
    .pipe(bundler())
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['build'], () => {
  return gulp.watch(sources, ['build']);
});

gulp.task('default', ['build']);
