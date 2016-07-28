const gulp = require('gulp');
const paeckchen = require('gulp-paeckchen').paeckchen;

gulp.task('build', () => {
  return gulp.src('./src/**/*.js')
    .pipe(paeckchen('./src/main.js'))
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['build']);
