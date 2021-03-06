import express from 'express';
import * as db from "../DB.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'

const router = express.Router();
//let dataStorage = new DataHandler();


const set_content_type = function (req, res, next) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next()
}

router.use(set_content_type);
router.use(express.json());  // to support JSON-encoded bodies
router.use(express.urlencoded( // to support URL-encoded bodies
    {
        extended: true
    }));


//controls the time a token lives needs to be 30 minutes at distribution.
const tokenLifeSpan = '1800s';

router.delete('/logout', db.authenticateToken, db.userIsApproved, async (req, res) => {
    db.logout(req.token,req.id);
    res.sendStatus(204) //successfuly deleted token
})

//getUserByEmail is the validation of the hash

router.post('/login', async (req, res, next) => {
    const searchedUser = await getUserByEmail(req.body.email);
    if (searchedUser) {
        req.id = searchedUser.id;
        next();
    } else {
        res.status(401).send("email not exist");
    }
}, db.userIsApproved, async (req, res) => {
    try {
        const { email, password } = req.body;//creating access token by userEmail mail

        //validate email & password
        const searchedUser = await getUserByEmail(email);
        const validPass = await bcrypt.compare(password, searchedUser.hashKey);
        if (!validPass) {
            res.status(401).send("invalid password");
        }
        //token 
        const accessToken = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: tokenLifeSpan });
        res.json({ accessToken: accessToken })
    } catch (e) {
        res.status(400).send(e.message);
    }
})



async function getUserByEmail(userEmail) {
    return db.users.find(user => user.email === userEmail);
}
router.post("/signup", async (req, res) => {
    try {
        const userEmail = req.body;
        const newUser = await db.addUserRequest(userEmail.name, userEmail.email, userEmail.password);
        res.send(newUser); //Todo: return added userEmail       
    } catch (e) {
        res.status(400).send(e.message);
    }
})
//authentication(req,res,next)
//every function which needs authentication will use authenticateToke
router.get("/post/all", db.authenticateToken, db.userIsApproved, (req, res) => {
    res.send(JSON.stringify(db.posts));
})

router.get("/getAllUsers", db.authenticateToken, db.userIsApproved, (req, res) => {
    res.json(db.users);
})

router.get("/post/:id", db.authenticateToken, db.userIsApproved,async (req, res) => {
    try {
        const post = await db.getPostById(req.params.id);
        res.send(JSON.stringify(post));
    } catch (e) {
        res.status(400).send(e.message);
    }
})


router.get("/message/all", db.authenticateToken, db.userIsApproved,  (req, res) => {
    const messages =  db.getAllMessageById(req.id);
    res.send(JSON.stringify(messages));
})

router.get("/message/:id", db.authenticateToken, db.userIsApproved, async(req, res) => {
    try {
        const message = await db.getMessageById(req.params.id);
        res.send(JSON.stringify(message));
    } catch (e) {
        res.status(400).send(e.message);
    }
})


//throws exception if bad format and exists the program.
//probably need to catch and return at response

router.post("/sendMessageToUser", db.authenticateToken, db.userIsApproved, (req, res) => {
    try {
        const userId = req.id;
        db.sendMessageToUser(req.body.text, userId);
        res.status(200).send("message send");
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e);
    }
})

router.post("/post", db.authenticateToken, db.userIsApproved, async (req, res) => {
    try {
        const postId = await db.createPost(req.body.message, req.id);
        res.send("postId = " + postId);
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e);
    }
})

router.delete("/:id", db.authenticateToken, db.userIsApproved, async (req, res) => {
    try {
        const userId = req.id;
        await db.deleteUser(userId);
        res.status(200).send("user deleted")
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e);
    }
})

router.delete("/post/:id", db.authenticateToken, db.userIsApproved, async (req, res) => {
    try {
        const userId = req.id;
        await db.deletePost(req.params.id, userId)
        res.status(200).status("post deleted")
    } catch (e) {
        console.log(e.message);
        res.status(400).send(e);
    }
})
export default router;
