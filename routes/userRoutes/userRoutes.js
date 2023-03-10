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
const crypto = require('crypto'); //μΆκ°λμ
const {getPagingData, getPagination} = require('../../controller/pagination');
const {makePassword, comparePassword} = require('../../controller/passwordCheckUtil');
const {fixed} = require("lodash/fp/_falseOptions");
const path = require("path");
const bodyParser = require('body-parser');
const parser = bodyParser.urlencoded({extended : false});
const {upload} = require("../../controller/fileupload");


router.get('/tourlandMain', async (req, res, next) => {

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

    let msg = `μΈμμ΄ μ‘΄μ¬νμ§ μμ΅λλ€.`
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

    let msg = `μΈμμ΄ μ‘΄μ¬νμ§ μμ΅λλ€.`
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
            // ID,PASSκ° μλ ₯λ κ²½μ°
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

        // μ§μ IDκ° μλ κ²½μ°
        if (userVO.userid == null) {
            error = "idnoneexist";
        } else {

            // μ§μ IDκ° μκ³  νν΄ν νμ
            if (userVO.usersecess === 1) {
                error = "retiredcustomer";
            } else if (userVO.usersecess === 0) {
                bcrypt.compare(req.body.pass, userVO.userpass, (err, result) => {
                    console.log("comparePassword2222->", result);
                    UserStay = userVO;
                    if (result) {
                        loginSuccess = true;

                        if (req.session.user) {
                            console.log(`μΈμμ΄ μ΄λ―Έ μ‘΄μ¬ν©λλ€.`);
                        } else {
                            req.session.user = {
                                "User": userVO.username,
                                "id": id,
                                "login": "user",
                                "Auth": userVO.userpass,
                                "pass": pass,
                                "mypage": "mypageuser",
                            }
                            console.log(`μΈμ μ μ₯ μλ£! `);
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
    console.log(`sessionμ μ­μ νμμ΅λλ€.`);
    res.redirect("/customer");
})

// κ³΅μ§μ¬ν­ μ μ²΄ λͺ©λ‘
router.get("/tourlandBoardNotice", async (req, res, next) => {

    const usersecess = req.params.usersecess;
    let { searchType, keyword } = req.query;

    const contentSize = Number(process.env.CONTENTSIZE); // ννμ΄μ§μ λμ¬ κ°μ
    const currentPage = Number(req.query.currentPage) || 1; //νμ¬νμ΄
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

    // userHeaderμ λ€μ΄κ°κ±°
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

// κ³΅μ§μ¬ν­ κ²μκΈ μ½κΈ°
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
     // notice νμ΄λΈμ μλ μλ£μ€ 1κ°λ§κ°κ³ μ€κΈ°


    // userHeaderμ λ€μ΄κ°κ±°
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/board/tourlandBoardNoticeDetail", {notice, Auth, login, Manager, searchkeyword});
});

// FAQ μ μ²΄ λͺ©λ‘
router.get('/tourlandBoardFAQ', async (req, res, next) => {

    const usersecess = req.params.usersecess;
    let { searchType, keyword } = req.query;

    const contentSize = 8 // ννμ΄μ§μ λμ¬ κ°μ
    const currentPage = Number(req.query.currentPage) || 1; //νμ¬νμ΄
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

    console.log('======λ°μ΄ν° μ μ²΄ count μ=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------ν νμ΄μ§μ λμ€λ λ°μ΄ν°-', listCount);

    const cri = {};


    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render('user/board/tourlandBoardFAQ', {list, cri, pagingData, Auth, login, Manager, searchkeyword});
})

//-------------------------------------μν λ¬Έμ μ¬ν­ μν λ¬Έμ μ¬ν­ μν λ¬Έμ μ¬ν­ μν λ¬Έμ μ¬ν­ μν λ¬Έμ μ¬ν­ μν λ¬Έμ μ¬ν­ --------------------------------------------------
// μν λ¬Έμ μ¬ν­
router.get('/tourlandPlanBoard', async (req, res, next) => {

    const contentSize = 8 // ννμ΄μ§μ λμ¬ κ°μ
    const currentPage = Number(req.query.currentPage) || 1; //νμ¬νμ΄
    const { limit, offset } = getPagination(currentPage, contentSize);


    const list =
        await  models.planboard.findAll({
            raw : true,
            order: [
                ["id", "DESC"]
            ],
            limit, offset
        });
    const listCount =
        await models.planboard.findAndCountAll({
            raw : true,
            order : [
                ["id", "DESC"]
            ],
            limit, offset
        });

    console.log('======λ°μ΄ν° μ μ²΄ count μ=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------ν νμ΄μ§μ λμ€λ λ°μ΄ν°-', listCount);

    const cri = {};
    const mypage = {};
    const pageMaker = {};


    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render('user/board/tourlandPlanBoard', {list, cri, pagingData, Auth, login, Manager, searchkeyword, mypage, pageMaker});
})

// μν λ¬Έμ μ¬ν­ κΈ λλ¬μ λ³΄κΈ°
router.get('/tourlandPlanBoardDetail', async (req, res, next) => {
    console.log('=---μΏΌλ¦¬μΆμΆ---',req.query);

    let plan =
        await models.planboard.findOne({
            raw: true,
            where: {
                id : req.query.id
            }
        });
    console.log('----κ²μκΈλ³΄κΈ°====', plan);
    let cri = {};

    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render('user/board/tourlandPlanBoardDetail',{plan, Auth, login, Manager, searchkeyword, cri});
})

// μν λ¬Έμμ¬ν­ κΈ λ±λ‘νλ νλ©΄μ
router.get('/tourlandPlanBoardRegister', (req, res, next) => {

    // userHeader μμ νμν λ³μλ€
    let Auth = {username:"manager", empname:"νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";
    console.log('------------------Authλκ΅¬------', Auth);


    res.render('user/board/tourlandPlanBoardRegister', {mypage, Auth, login, Manager, searchkeyword});
})

// μν λ¬Έμ μ¬ν­ λ±λ‘νκΈ°
router.post('/tourlandPlanBoardRegister', async (req, res, next) => {
// userHeader μμ νμν λ³μλ€
    let Auth = {username:"manager", empname:"νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";

    const PlanRegister = await models.planboard.create({
        raw: true,
        title : req.body.title,
        content : req.body.content,
        writer : req.body.writer,
        regdate : req.body.regdate,
        answer : 0,

    });
    console.log('------------------κ²μκΈ λ±λ‘-----------------', PlanRegister);

// ------------------μν λ¬Έμ λ±λ‘νλ©΄ κ²μν λͺ©λ‘ λ³΄μ¬μ€μΌνλ―λ‘ listκ°λ κ°μ΄ μ μ‘ν΄μ κ²μν λͺ©λ‘ λ€μ λΆλ¬μ€κΈ° -----------------------------------
    const contentSize = 5 // ννμ΄μ§μ λμ¬ κ°μ
    const currentPage = Number(req.query.currentPage) || 1; //νμ¬νμ΄
    const { limit, offset } = getPagination(currentPage, contentSize);

    const list =
        await  models.planboard.findAll({
            raw : true,
            order: [
                ["id", "DESC"]
            ],
            limit, offset
        });
    const listCount =
        await models.planboard.findAndCountAll({
            raw : true,
            order : [
                ["id", "DESC"]
            ],
            limit, offset
        });
    console.log('======λ°μ΄ν° μ μ²΄ count μ=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------ν νμ΄μ§μ λμ€λ λ°μ΄ν°-', listCount);
    let cri = currentPage;


    res.render('user/board/tourlandPlanBoard', {PlanRegister, Auth, login, Manager, mypage, searchkeyword, list, pagingData, cri});
});


//-----------------------------------------μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°μ¬ννκΈ°----------------------------------------------------------------
// μ¬ν νκΈ° κ²μν λͺ©λ‘ λ³΄κΈ°
router.get('/tourlandCustBoard', async (req, res, next) => {
    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    const contentSize = 5 // ννμ΄μ§μ λμ¬ κ°μ
    const currentPage = Number(req.query.currentPage) || 1; //νμ¬νμ΄
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
    console.log('======λ°μ΄ν° μ μ²΄ count μ=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------ν νμ΄μ§μ λμ€λ λ°μ΄ν°-', listCount);
    let cri = currentPage;


    res.render('user/board/tourlandCustBoard', {Auth, login, Manager, searchkeyword, cri, list, pagingData})
})

// μ¬ν νκΈ° κ²μκΈ λ³΄κΈ°
router.get('/tourlandCustBoardDetail', async (req, res, next) => {
    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    console.log('=---μΏΌλ¦¬μμ id μΆμΆ ---',req.query.id);

    let custBoardVO =
        await models.custboard.findOne({
            raw: true,
            where: {
                id : req.query.id
            }
        });
    console.log('----κ²μκΈλ³΄κΈ°====', custBoardVO);
    // custBoardVO νμ΄λΈμ μλ μλ£μ€ 1κ°λ§κ°κ³ μ€κΈ°
    let mypage = "mypageuser";
    console.log('------μμ±μ(νμ¬μ¬μ©μ)λͺ????----->>>>', mypage);



    res.render('user/board/tourlandCustBoardDetail',{custBoardVO, Auth, login, Manager, searchkeyword, mypage});
})


// μ¬ν νκΈ° λ±λ‘νλ νμ΄μ§ λ³΄κΈ°
router.get('/tourlandCustBoardRegister', (req, res, next) => {

    let custBoardVO = {};
    let cri = {};

    // userHeader μμ νμν λ³μλ€
    let Auth = {username:"manager", empname:"νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";
    console.log('------------------Authλκ΅¬------', Auth);

    res.render('user/board/tourlandCustBoardRegister', {mypage, Auth, custBoardVO, login, Manager, searchkeyword, cri})
})

// μ¬ν νκΈ° λ±λ‘νκΈ°
router.post('/tourlandCustBoardRegister', upload.single("image"), async (req, res, next) => {
// userHeader μμ νμν λ³μλ€
    let Auth = {username:"manager", empname:"νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";
    console.log('--------------λ±λ‘νλ°Authλκ΅¬------', Auth.username);

    let body = {};
    if( req.file !=null){
        body = {
            raw: true,
            title : req.body.title,
            content : req.body.content,
            writer : req.body.writer,
            regdate : req.body.regdate,
            image : req.file.filename
        }
    }
    else{
        body = {
            raw: true,
            title : req.body.title,
            content : req.body.content,
            writer : req.body.writer,
            regdate : req.body.regdate,
        }
    }

    const custRegister = await models.custboard.create(body);

    console.log('-------μ΄λ―Έμ§ λ±λ‘???----------', req.file);
    console.log('------------------κ²μκΈ λ±λ‘-----------------', custRegister);

// ------------------κ²μκΈ λ±λ‘νλ©΄ νκΈ° κ²μν λͺ©λ‘ λ³΄μ¬μ€μΌνλ― listκ°λ κ°μ΄ μ μ‘ν΄μ κ²μκΈ λͺ©λ‘ λ€μ λΆλ¬μ€κΈ° -----------------------------------
    const contentSize = 5 // ννμ΄μ§μ λμ¬ κ°μ
    const currentPage = Number(req.query.currentPage) || 1; //νμ¬νμ΄
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
    console.log('======λ°μ΄ν° μ μ²΄ count μ=======', listCount.count);
    const pagingData = getPagingData(listCount, currentPage, limit);
    console.log('--------ν νμ΄μ§μ λμ€λ λ°μ΄ν°-', listCount);
    let cri = currentPage;


    res.render('user/board/tourlandCustBoard', {custRegister, Auth, login, Manager, mypage, searchkeyword, list, pagingData, cri});
});


// μ¬ννκΈ° μμ νκΈ° νλ©΄ λ³΄μ΄κΈ°
router.get('/tourlandCustBoardRegisterEdit', upload.single("image"), async (req, res, next) => {

    let custBoardVO = {};
    let cri = {};

    const toUpdate = await models.custboard.findOne({
        raw : true,
        where : {
            id : req.query.id,
        }
    });
    console.log('-----------μΏΌλ¦¬μ λ³΄-------', req.query);
    console.log('----------μμ νλ©΄μμ₯----------', toUpdate);

    // userHeader μμ νμν λ³μλ€
    let Auth = {username: "manager", empname: "νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";


        res.render('user/board/tourlandCustBoardRegisterEdit', {
            mypage,
            Auth,
            custBoardVO,
            login,
            Manager,
            searchkeyword,
            cri,
            toUpdate,
        })
});


// μ¬ννκΈ° μμ νκΈ° μ μ‘
router.post('/tourlandCustBoardRegisterEdit', parser,upload.single("image"),   async (req, res, next) => {

    console.log("444444444444->",req.body.id);
    // userHeader μμ νμν λ³μλ€
    let Auth = {username: "manager", empname: "νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";

    let body = {};
    if( req.file !=null){
        body = {
            raw : true,
            content: req.body.content,
            title: req.body.title,
            image : req.file.fileName,
        }
    } else {
        body = {
            raw : true,
            content: req.body.content,
            title: req.body.title,
        }
    }

    const update = await models.custboard.update(body, {
        where : {
            id : req.body.id,
        }
    });

    console.log('-----------req.file---------', req.file);
    // μμ νκ³  μμ λ νμ΄μ§ λ³΄μ¬μ£ΌκΈ°
    // const custBoardVO = await models.custboard.findOne({
    //     raw: true,
    //     where: {
    //         id : req.query.id
    //     }
    // });

    console.log('----------μμ ----------', update);
    // console.log('--------custBoardVo-----', custBoardVO);

    res.redirect("/customer/tourlandCustBoard");
    // res.render('user/board/tourlandCustBoardDetail', {
    //     mypage,
    //     Auth,
    //     custBoardVO,
    //     login,
    //     Manager,
    //     searchkeyword,
    //     update,
    // })

});

// μ¬ννκΈ° μ­μ νκΈ°
router.delete('/tourlandCustBoardDetail', async (req, res, next) => {

    let custBoardVO = {};
    let boardId = req.query.id

    // const result = await models.custboard.destroy({
    //     where : {
    //         id : boardId,
    //     }
    // });
    models.custboard.destroy({
        where : {
            id : boardId,
        }
    }).then( (result) => {
        console.log(result);
    }).catch( (err) => {
        console.log(err);
        next(err);
    })

    // console.log('=========μ­μ ========', result);

    // userHeader μμ νμν λ³μλ€
    let Auth = {username: "manager", empname: "νμ€νΈ"};
    let login = "";
    let Manager = {};
    let searchkeyword = "";
    let mypage = "mypageuser";


    res.render('user/board/tourlandCustBoard', {
        mypage,
        Auth,
        custBoardVO,
        login,
        Manager,
        searchkeyword,
    })

});


//-----------------------------------μ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈμ΄λ²€νΈ----------------------------------------
// μ΄λ²€νΈ λͺ©λ‘ (νμ¬ μ§νμ€μΈ μ΄λ²€νΈλ€ λμ΄)
router.get("/tourlandEventList/ingEvent", async (req, res, next) => {

        const eventList = await models.event.findAll({
            raw : true,
            where : {
                enddate : {[Op.gt] : new Date()},
            },
        });
        // console.log('-------------123123123--', eventList); μ΄κ±° μ£Όμμ²λ¦¬ ν΄νμ λ©΄ μ½μμ μ΄λ―Έμ§ μ£Όμ κΈΈκ² λμ΄

    let mistyrose = {};

    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/event/tourEventList", {Auth, login, Manager, searchkeyword, eventList, mistyrose});
});

// λ§λ£λ μ΄λ²€νΈ λͺ©λ‘
router.get("/tourlandEventList/expiredEvent", async (req, res, next) => {

    const eventList = await models.event.findAll({
        raw : true,
        where : {
            enddate : {[Op.lt] : new Date()},
        },
    });
    console.log('-----λ§λ£λμ΄λ²€νΈλͺ©λ‘--', eventList);

    let mistyrose = {};

    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";

    res.render("user/event/tourEventEndList", {Auth, login, Manager, searchkeyword, eventList, mistyrose});
});

// μ΄λ²€νΈ μμΈνμ΄μ§
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

    // userHeader μμ νμν λ³μλ€
    let Auth = {};
    let login = "";
    let Manager = {};
    let searchkeyword = "";


    res.render('user/event/eventDetailPage', {Auth, login, Manager, searchkeyword, eventVO, no});
});



module.exports = router;

