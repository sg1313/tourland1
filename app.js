const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config({ path: '.env' });
const cors = require('cors');
const { sequelize } = require('./models/index'); // 시퀄라이즈
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/indexApi');
const userRoutes = require('./routes/userRoutes/userRoutes');
const managerRoutes = require('./routes/managerRoutes/managerRoutes');
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("1234"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));

app.use(session({}));

sequelize.sync({ force: false }) // 서버 실행시마다 테이블을 재생성할건지에 대한 여부
    .then(() => {
      console.log('데이터베이스 연결 성공');
    })
    .catch((err) => {
      console.error(err);
    });

//Route 등록
app.use('/', indexRouter);
app.use('/api',
    cors({
        origin: true,
        credentials: true,
    }),
    apiRouter);

app.use('/customer', userRoutes);
app.use('/manager', managerRoutes);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
