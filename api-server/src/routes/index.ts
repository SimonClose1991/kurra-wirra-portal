import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sectionsRouter from "./sections";
import categoriesRouter from "./categories";
import documentsRouter from "./documents";
import completionsRouter from "./completions";
import usersRouter from "./users";
import progressRouter from "./progress";
import storageRouter from "./storage";
import formsRouter from "./forms";
import notesRouter from "./notes";
import staffDocumentsRouter from "./staff-documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sectionsRouter);
router.use(categoriesRouter);
router.use(documentsRouter);
router.use(completionsRouter);
router.use(usersRouter);
router.use(progressRouter);
router.use(storageRouter);
router.use(formsRouter);
router.use(notesRouter);
router.use(staffDocumentsRouter);

export default router;
