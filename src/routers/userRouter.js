import express from "express";
import { avatarUpload, protectorMiddleware, publicOnlyMiddleware } from "../controllers/middlewares";
import {
    see, logout, startGithubLogin, finishGithubLogin, startKakaoLogin, finishKakaoLogin, getEdit, postEdit, getChangePassword, postChangePassword
} from "../controllers/userController";

const userRouter = express.Router();

userRouter.get("/logout", protectorMiddleware, logout);
userRouter.route("/edit").all(protectorMiddleware).get(getEdit).post(avatarUpload.single("avatar"), postEdit);
userRouter.route("/change-password").all(protectorMiddleware).get(getChangePassword).post(postChangePassword);
userRouter.get("/github/start", publicOnlyMiddleware, startGithubLogin);
userRouter.get("/github/finish", publicOnlyMiddleware, finishGithubLogin);
userRouter.get("/kakao/start", publicOnlyMiddleware, startKakaoLogin);
userRouter.get("/kakao/finish", publicOnlyMiddleware, finishKakaoLogin);
userRouter.get("/:id", see);

export default userRouter;