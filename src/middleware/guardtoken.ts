import { NextFunction, Request, Response } from "express";
import {verify} from "jsonwebtoken"

const verifyToken = (token: string) => {
    return verify(token, process.env.JWT_SECRET as string);
};

export const guardToken = (req: Request, res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization;
    const token = bearer?.split(' ')[1];

    if (!token) {
        return res.status(400).send();
    }

    try {
        (req as any).user = verifyToken(token);
        next();
    } catch (error) {
        res.status(400).send()
    }
}