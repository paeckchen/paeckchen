const gulp = require('gulp');
const ts = require('gulp-typescript');
const paeckchen = require('gulp-paeckchen').paeckchen;
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');

const tsProject = ts.createProject('tsconfig.json');

const paeckchenConfig = {
  entryPoint: './src/main',
  outputFile: './src/main.js',
  sourceMap: 'inline',
  logLevel: 'debug'
};

gulp.task('build', () => {
  return tsProject.src()
    .pipe(ts(tsProject))
    .pipe(paeckchen(paeckchenConfig))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['build'], () => {
  return gulp.watch('./src/**/*.ts', ['build']);
});

gulp.task('default', ['build']);
