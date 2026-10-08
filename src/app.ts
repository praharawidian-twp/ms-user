import express, { Application, Request, Response } from "express";
import { userRouter } from "./modules/users/user.routes";
import cors from "cors";

export const app: Application = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
    res.send("User Service is running");
});

app.use("/api/users", userRouter);
