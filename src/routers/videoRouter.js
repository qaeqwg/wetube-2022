import express from "express";
import { upload, watch, getEdit, deleteVideo, postEdit, getUpload, postUpload } from "../controllers/videoController";

const videoRouter = express.Router();

videoRouter.route("/:id([0-9a-f]{24})").get(watch);
videoRouter.route("/:id([0-9a-f]{24})/edit").get(getEdit).post(postEdit);
videoRouter.route("/:id([0-9a-f]{24})/delete").get(deleteVideo);
videoRouter.route("/upload").get(getUpload).post(postUpload);

export default videoRouter;