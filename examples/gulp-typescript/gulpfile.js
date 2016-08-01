const gulp = require('gulp');
const ts = require('gulp-typescript');
const paeckchen = require('gulp-paeckchen').paeckchen;
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

const tsProject = ts.createProject('tsconfig.json');

const bundler = paeckchen({
  // This is already transpiled by typescript, therefore its main.js
  entryPoint: './src/main.js',
  // We should specifiy this, otherwise the first (maybe random) file give to gulp will name it
  outputFile: './src/main.js',
  sourceMap: 'inline',
  logLevel: 'debug'
});

gulp.task('build', () => {
  return tsProject.src()
    .pipe(ts(tsProject))
    .pipe(bundler())
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['build'], () => {
  return gulp.watch('./src/**/*.ts', ['build']);
});

gulp.task('default', ['build']);
