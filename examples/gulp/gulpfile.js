const gulp = require('gulp');
const paeckchen = require('gulp-paeckchen').paeckchen;

const bundler = paeckchen({
  entryPoint: 'main.js',
  logLevel: 'trace'
});

gulp.task('build', () => {
  return gulp.src('./src/**/*.js')
    .pipe(bundler())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', ['build'], () => {
  return gulp.watch('./src/**/*.js', ['build']);
});

gulp.task('default', ['build']);
