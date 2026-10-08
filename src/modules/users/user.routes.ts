import { Router } from "express";
import { userrValidator } from "./user.validator";
import { createUserHandler, getAllUserHandler, getUserByIdHandler } from "./user.controller";
import { param } from 'express-validator';

const router = Router();

router.post("/", userrValidator.createUser, createUserHandler);
router.get("/", getAllUserHandler);
router.get("/:id", userrValidator.validUserID, getUserByIdHandler);

export { router as userRouter };
