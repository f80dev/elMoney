import {removeHTML, translateQuery} from "./tools";

describe("Tools",()=>{
  it("removeHTML",()=>{
    expect(removeHTML("<br><p>coucou</p>")).toEqual("coucou");
  });
})
