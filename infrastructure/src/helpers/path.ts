import * as path from "path";

export function getPath(relativePath:string) {
    const projectRoot = "../";
    return path.resolve(projectRoot, relativePath);
}