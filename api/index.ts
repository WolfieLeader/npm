import { Request, Response } from "express";
import app from "./app";
import getClientIp from "../src";

app.get("/", (req: Request, res: Response) => {
  getClientIp.getIp(req);
  res.send("lets go");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
