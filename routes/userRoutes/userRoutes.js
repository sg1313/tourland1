const express = require('express');
const router = express.Router();
const sequelize = require("sequelize");
const Op = sequelize.Op;
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);

const models = require("../../models");
const fs = require('fs');
const querystring = require('querystring');
const crypto = require('crypto'); //추가됐음
const {getPagingData, getPagination} = require('../../controller/pagination');
const {makePassword, comparePassword} = require('../../controller/passwordCheckUtil');
const {fixed} = require("lodash/fp/_falseOptions");


router.get('/', async (req, res, next) => {

    const currentProductPrice = {};
    const currentProductPrice2 = {};
    const currentProduct = {};
    const currentProduct2 = {};

    const popup1 = await models.popup.findOne({
        raw: true,
        where: {
            position: "R"
        }
    });

    const startDate = new Date(popup1.enddate) - new Date(popup1.startdate);
    const endDate = Math.abs(startDate / (24 * 60 * 60 * 1000));

    // console.log("startdate->", startDate);
    // console.log("enddate->", endDate);

    const cookieConfig = {
        expires: new Date(Date.now() + endDate * 24 * 60 * 60),
        path: '/',
        signed: true
    };
    res.cookie("popup1", popup1.pic, cookieConfig)

    const popup2 = await models.popup.findOne({
        raw: true,
        where: {
            position: "L"
        }
    });

    const startDate2 = new Date(popup2.enddate) - new Date(popup2.startdate);
    const endDate2 = Math.abs(startDate2 / (24 * 60 * 60 * 1000));

    const cookieConfig2 = {
        expires: new Date(Date.now() + endDate2 * 24 * 60 * 60),
        path: '/',
        signed: true,
    };
    res.cookie("popup2", popup2.pic, cookieConfig2)


    const banner1 = await models.banner.findOne({
        raw: true,
        where: {
            position: "L"
        }
    });
    const banner2 = await models.banner.findOne({
        raw: true,
        where: {
            position: "R"
        }
    });

    let Auth = null;
    let login = "";

    let msg = `세션이 존재하지 않습니다.`
    if (req.session.user) {
        msg = `${req.session.user.User}`;
        Auth = {username: req.session.user.User};
        login = req.session.user.login;
    }

    console.log("Auth->", Auth, msg);

    let Manager = {};
    let {searchType, keyword, keyword2} = req.query;
    let searchkeyword = keyword;


    res.render('tourlandMain', {
        currentProductPrice,
        currentProductPrice2,
        currentProduct,
        currentProduct2,
        popup1: popup1,
        popup2,
        banner1,
        banner2,
        Auth,
        login,
        Manager,
        searchkeyword
    });

});

router.get('/tourlandRegister', function (req, res, next) {

    let autoNo = "";

    let userVO = {};


    let Auth = null;
    let login = "";

    let msg = `세션이 존재하지 않습니다.`
    if (req.session.user) {
        msg = `${req.session.user.User}`;
        Auth = {username: req.session.user.User};
        login = req.session.user.login;
    }

    console.log("Auth->", Auth, msg);

    let Manager = {};
    let {searchType, keyword, keyword2} = req.query;
    let searchkeyword = keyword;


    res.render("user/tourlandRegisterForm", {autoNo, Auth, login, Manager, searchkeyword, userVO});
});

router.post('/tourlandRegister', async (req, res, next) => {
    let query;
    console.log("register->", req.body);

    // Check if the email is already in use
    let userExists = await models.user.findOne({
        raw: true,
        where: {
            userid: req.body.userid
        }
    });

    if (userExists) {
        res.status(401).json({message: "Email is already in use."});
        return;
    }

    // Define salt rounds
    const saltRounds = 10;
    // Hash password
    bcrypt.hash(req.body.userpass, saltRounds, (err, hash) => {
        if (err) throw new Error("Internal Server Error");

        req.body.userpass = hash;

        const user = models.user.create(req.body);
        query = querystring.stringify({
            "registerSuccess": true,
            "id": user.userid
        });
        res.redirect('/customer/loginForm/?' + query);
    });

});

router.get('/idCheck/:userid', async (req, res, next) => {

    const userid = req.params.userid;

    try {
        let checkUserid = await models.user.findOne({
            raw: true,
            attributes: ['userid'],
            where: {
                userid: userid
            }
        })

        if (checkUserid != null) {
            console.log("check->", checkUserid.userid);
            if (checkUserid.userid != null) {
                res.status(200).send("exist");
            }
        } else {
            res.status(200).send("notexist");
        }
    } catch (e) {
        console.error(e);
        next(e);
    }

});

router.get('/loginForm', async (req, res, next) => {
    let {registerSuccess, id} = req.query;

    let UserStay = {userid: id};

    let EmpStay = {};
    let error = "";
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render("user/tourlandLoginForm", {
        Auth,
        login,
        Manager,
        searchkeyword,
        registerSuccess,
        UserStay,
        EmpStay,
        error
    });
});

const fecthData = async (req) => {
    let {id, pass} = req.body;
    let error = "";

    if (id == null) {
        error = 'idempty';
    }
    if (pass == null) {
        error = 'passempty';
    }

    let userVO;
    try {
        if (id !== null && pass != null) {
            // ID,PASS가 입력된 경우
            userVO = await models.user.findOne({
                raw: true,
                // attributes: ['userid', 'userpass','usersecess'],
                where: {
                    userid: id
                }
            })
        }

    } catch (e) {
        console.log(e);
    }

    return userVO;

}


router.post('/loginForm', (req, res, next) => {
    let {id, pass} = req.body;

    let empVO = {};
    let session = {};

    let registerSuccess = {};
    let UserStay;
    let EmpStay = {};
    let error = "";
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let loginSuccess = false;

    fecthData(req).then((userVO) => {

        // 직원 ID가 없는 경우
        if (userVO.userid == null) {
            error = "idnoneexist";
        } else {

            // 직원 ID가 있고 탈퇴한 회원
            if (userVO.usersecess === 1) {
                error = "retiredcustomer";
            } else if (userVO.usersecess === 0) {
                bcrypt.compare(req.body.pass, userVO.userpass, (err, result) => {
                    console.log("comparePassword2222->", result);
                    UserStay = userVO;
                    if (result) {
                        loginSuccess = true;

                        if (req.session.user) {
                            console.log(`세션이 이미 존재합니다.`);
                        } else {
                            req.session.user = {
                                "User": userVO.username,
                                "id": id,
                                "login": "user",
                                "Auth": userVO.userpass,
                                "pass": pass,
                                "mypage": "mypageuser",
                            }
                            console.log(`세션 저장 완료! `);
                        }
                        res.redirect('/customer');
                    } else {
                        console.log("comparePassword4444->", result);
                        error = "passnotequal";
                        res.render("user/tourlandLoginForm", {
                            Auth,
                            login,
                            Manager,
                            searchkeyword,
                            registerSuccess,
                            UserStay,
                            EmpStay,
                            error
                        });

                    }
                })

            } else {
                error = "usernotfind";
            }

        }

    })

});

router.get("/logout", (req, res, next) => {

    req.session.destroy();
    console.log(`session을 삭제하였습니다.`);
    res.redirect("/customer");
})

router.get("/tourlandBoardNotice", async (req, res, next) => {

    const usersecess = req.params.usersecess;
    let { searchType, keyword } = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const { limit, offset } = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";


    let cri = {currentPage};

    let noticeFixedList =
        await  models.notice.findAll({
            raw : true,
            where : {
                fixed : 1
            },
            limit, offset
        });
    console.log('====',noticeFixedList);

    let noticeNoFixedList =
        await models.notice.findAll({
            raw : true,
            where : {
                fixed: 0
            },
            order : [
                ["regdate", "DESC"]
            ],
            limit, offset
            });

    let noticeNoFixedCountList =
        await models.notice.findAndCountAll({
            raw : true,
            where : {
                fixed: 0
            },
            order : [
                ["regdate", "DESC"]
            ],
            limit, offset
        });

    const pagingData = getPagingData(noticeNoFixedCountList, currentPage, limit);
    console.log('---------', noticeNoFixedList);

    // userHeader에 들어갈거
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/board/tourlandBoardNotice", {
        noticeFixedList,
        noticeNoFixedList,
        cri,
        Auth,
        login,
        Manager,
        searchkeyword,
        pagingData
    });
})

router.get("/tourlandBoardNoticeDetail", async (req, res, next) => {

    let notice =
        await models.notice.findOne({
            raw: true,
            where: {
                no : req.query.no
            }
        });
    console.log(notice);
    console.log(req.query);
     // notice 테이블에 있는 자료중 1개만갖고오기


    // userHeader에 들어갈거
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/board/tourlandBoardNoticeDetail", {notice, Auth, login, Manager, searchkeyword});
});


router.get('/tourlandBoardFAQ', async (req, res, next) => {

    const usersecess = req.params.usersecess;
    let { searchType, keyword } = req.query;

    const contentSize = 8 // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const { limit, offset } = getPagination(currentPage, contentSize);

    keyword = keyword ? keyword : "";

    const list =
        await  models.faq.findAll({
            raw : true,
            order: [
                ["no", "DESC"]
            ],
            limit, offset
        });
    const listCount =
        await models.faq.findAndCountAll({
            raw : true,
            order : [
                ["no", "DESC"]
            ],
            limit, offset
        });

    console.log('======데이터 전체 count 수=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------한 페이지에 나오는 데이터-', listCount);

    const cri = {};


    // userHeader 에서 필요한 변수들
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render('user/board/tourlandBoardFAQ', {list, cri, pagingData, Auth, login, Manager, searchkeyword});
})

// 여행 후기 게시판 목록 보기
router.get('/tourlandCustBoard', async (req, res, next) => {
    // userHeader 에서 필요한 변수들
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    const contentSize = 5 // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const { limit, offset } = getPagination(currentPage, contentSize);

    const list =
        await  models.custboard.findAll({
            raw : true,
            order: [
                ["id", "DESC"]
            ],
            limit, offset
        });
    const listCount =
        await models.custboard.findAndCountAll({
            raw : true,
            order : [
                ["id", "DESC"]
            ],
            limit, offset
        });
    console.log('======데이터 전체 count 수=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------한 페이지에 나오는 데이터-', listCount);
    let cri = currentPage;


    res.render('user/board/tourlandCustBoard', {Auth, login, Manager, searchkeyword, cri, list, pagingData})
})

// 여행 후기 게시글 보기
router.get('/tourlandCustBoardDetail', async (req, res, next) => {
    console.log('=---쿼리추출---',req.query);

    let custBoardVO =
        await models.custboard.findOne({
            raw: true,
            where: {
                id : req.query.id
            }
        });
    console.log('----게시글보기====', custBoardVO);
    // custBoardVO 테이블에 있는 자료중 1개만갖고오기
    let mypage = "mypageuser";
    console.log('------작성자(현재사용자)명????----->>>>', mypage);

    // userHeader 에서 필요한 변수들
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render('user/board/tourlandCustBoardDetail',{custBoardVO, Auth, login, Manager, searchkeyword, mypage});
})

// 여행 후기 등록 페이지 보기
router.get('/tourlandCustBoardRegister', (req, res, next) => {

    let custBoardVO = {};
    let cri = {};

    // userHeader 에서 필요한 변수들
    let Auth = {username:"manager", empname:"테스트"};
    // let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";
    // let mypage = "mypageemp";
    console.log('------------------Auth누구------', Auth);

    res.render('user/board/tourlandCustBoardRegister', {mypage, Auth, custBoardVO, login, Manager, searchkeyword, cri})
})

/// 게시글 등록하기
router.post('/tourlandCustBoardRegister', async (req, res, next) => {
// userHeader 에서 필요한 변수들
    let Auth = {username:"manager", empname:"테스트"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";
    console.log('--------------등록했따Auth누구------', Auth.username);

    const custRegister = await models.custboard.create({
        raw: true,
        title : req.body.title,
        content : req.body.content,
        writer : req.body.username,
        regdate : req.body.regdate,
    });
    console.log('------------req.body-----------------', req.body);
    console.log('------------req.body.writer--------', req.body.writer);

    console.log('-------작성자 누구custRegister.writer----------', custRegister.writer);
    console.log('------------------게시글 등록-----------------', custRegister);

// ------------------게시글 등록하면 후기 게시판 목록 보여줘야하므 list값도 같이 전송해서 게시글 목록 다시 불러오기 -----------------------------------
    const contentSize = 5 // 한페이지에 나올 개수
    const currentPage = Number(req.query.currentPage) || 1; //현재페이
    const { limit, offset } = getPagination(currentPage, contentSize);

    const list =
        await  models.custboard.findAll({
            raw : true,
            order: [
                ["id", "DESC"]
            ],
            limit, offset
        });
    const listCount =
        await models.custboard.findAndCountAll({
            raw : true,
            order : [
                ["id", "DESC"]
            ],
            limit, offset
        });
    console.log('======데이터 전체 count 수=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------한 페이지에 나오는 데이터-', listCount);
    let cri = currentPage;


    res.render('user/board/tourlandCustBoard', {custRegister, Auth, login, Manager, mypage, searchkeyword, list, pagingData, cri});
});


// 게시글 수정하기
router.get('/tourlandCustBoardRegister?', async (req, res, next) => {

    let custBoardVO = {};
    let cri = {};

    const update = await models.custboard.findOne( {
        raw : true,
        where : {
            id : req.query.id,
            title : req.body.title,
            content : req.body.content,
            writer : req.body.username,
        }
    })
    console.log('----------수정----------', update);

    // userHeader 에서 필요한 변수들
    let Auth = {username: "manager", empname: "테스트"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";

    console.log('------------------Auth누구------', Auth);

    res.render('user/board/tourlandCustBoardRegister', {
        mypage,
        Auth,
        custBoardVO,
        login,
        Manager,
        searchkeyword,
        cri,
        update,
    })

});


// 이벤트 목록 (현재 진행중인 이벤트들 나옴)
router.get("/tourlandEventList/ingEvent", async (req, res, next) => {

        const eventList = await models.event.findAll({
            raw : true,
            where : {
                enddate : {[Op.gt] : new Date()},
            },
        });
        console.log('-------------123123123--', eventList);

    let mistyrose = {};

    // userHeader 에서 필요한 변수들
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/event/tourEventList", {Auth, login, Manager, searchkeyword, eventList, mistyrose});
});


router.get("/tourlandEventList/expiredEvent", async (req, res, next) => {

    const eventList = await models.event.findAll({
        raw : true,
        where : {
            enddate : {[Op.lt] : new Date()},
        },
    });
    console.log('-----만료된이벤트목록--', eventList);

    let mistyrose = {};

    // userHeader 에서 필요한 변수들
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/event/tourEventEndList", {Auth, login, Manager, searchkeyword, eventList, mistyrose});
});


// 이벤트 상세페이지
router.get("/eventDetailPage", async(req, res, next) => {
    console.log('---------', req.query);
    let {no} = req.query;

    const eventVO =
        await models.event.findOne({
            raw: true,
            where: {
                id : no
            }
        });
    console.log(eventVO);

    // userHeader 에서 필요한 변수들
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render('user/event/eventDetailPage', {Auth, login, Manager, searchkeyword, eventVO, no});
});



module.exports = router;

