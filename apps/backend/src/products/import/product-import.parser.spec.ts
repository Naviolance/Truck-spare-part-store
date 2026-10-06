import { ProductCondition, ProductStatus } from "@truckparts/prisma";
import { IMPORT_TEMPLATE_CSV, decodeCsv, detectDelimiter, parsePrice, parseProductCsv, parseVehicle } from "./product-import.parser";

const csv = (text: string) => Buffer.from(text, "utf8");

describe("parsePrice (XAF, whole numbers)", () => {
  it.each([
    ["12500", 12500],
    ["12 500", 12500],
    ["12.500", 12500],
    ["12,500", 12500],
    ["12 500 FCFA", 12500],
    ["12500,00", 12500],
    ["1.250.000 XAF", 1250000],
  ])("%s -> %d", (raw, expected) => expect(parsePrice(raw)).toBe(expected));

  it.each(["12,50", "abc", "", "-500"])("rejects %s", (raw) => expect(parsePrice(raw)).toBeNull());
});

describe("parseVehicle", () => {
  it("reads make / model / years / engine", () => {
    expect(parseVehicle("Mercedes-Benz / Actros / 2012-2024 / OM471")).toEqual({
      manufacturer: "Mercedes-Benz",
      model: "Actros",
      yearStart: 2012,
      yearEnd: 2024,
      engine: "OM471",
    });
  });
  it("accepts open-ended and single years", () => {
    expect(parseVehicle("Volvo / FH16 / 2015+")).toMatchObject({ yearStart: 2015, yearEnd: null });
    expect(parseVehicle("Volvo / FH16 / 2015")).toMatchObject({ yearStart: 2015, yearEnd: null });
  });
  it("explains a malformed entry", () => {
    expect(parseVehicle("Volvo FH16")).toMatch(/Make \/ Model/);
    expect(parseVehicle("Volvo / FH16 / 2024-2015")).toMatch(/before the start/);
  });
});

describe("decoding and separators", () => {
  it("reads a Windows-1252 file (French Excel's plain CSV) with accents intact", () => {
    const latin1 = Buffer.from("nom;catégorie\r\nFiltre à huile;Filtres", "latin1");
    expect(decodeCsv(latin1)).toContain("Filtre à huile");
  });
  it("strips a UTF-8 BOM", () => {
    expect(decodeCsv(Buffer.from("\uFEFFname", "utf8"))).toBe("name");
  });
  it("detects ; and , separators", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });
});

describe("parseProductCsv", () => {
  it("parses the downloadable template without errors", () => {
    const { rows, errors } = parseProductCsv(csv(IMPORT_TEMPLATE_CSV));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      name: "Plaquettes de frein avant",
      category: "Brakes",
      brand: "Bosch",
      crossReference: ["A0064200520", "29087"],
      condition: ProductCondition.NEW,
      price: 45000,
      quantity: 12,
      status: ProductStatus.PUBLISHED,
    });
    expect(rows[0].vehicles).toHaveLength(2);
    expect(rows[2].status).toBe(ProductStatus.DRAFT);
  });

  it("accepts French headers and values from a French Excel file", () => {
    const file = Buffer.from(
      "Nom;Catégorie;Marque;Référence;État;Prix;Quantité;Camions\r\nDisque d'embrayage;Transmission;Sachs;1878 004 832;Occasion;\"85 000 FCFA\";2;DAF / XF / 2016+",
      "latin1",
    );
    const { rows, errors } = parseProductCsv(file);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ name: "Disque d'embrayage", condition: ProductCondition.USED, price: 85000, quantity: 2, partNumber: "1878 004 832" });
  });

  it("reports every bad cell with its line and keeps good rows", () => {
    const { rows, errors } = parseProductCsv(
      csv("name,category,condition,price,quantity\nGood part,Filters,new,1000,3\nX,Filters,broken,12.50,-1\n"),
    );
    expect(rows).toHaveLength(1);
    expect(errors.map((e) => `${e.line}:${e.field}`).sort()).toEqual(["3:condition", "3:name", "3:price", "3:quantity"]);
  });

  it("refuses a file missing required columns", () => {
    const { errors } = parseProductCsv(csv("name,price\nA part,1000"));
    expect(errors[0].message).toMatch(/Missing required column\(s\): category, condition, quantity/);
  });

  it("flags the same part number + brand twice in one file", () => {
    const { errors } = parseProductCsv(
      csv("name,category,brand,partNumber,condition,price,quantity\nA part,Filters,Mann,W962,new,1,1\nAnother,Filters,mann,w962,new,1,1"),
    );
    expect(errors).toEqual([expect.objectContaining({ line: 3, field: "partNumber" })]);
  });

  it("leaves an empty description as null and warns on used parts without notes", () => {
    const { rows, warnings } = parseProductCsv(csv("name,category,condition,price,quantity\nUsed pump,Engine,used,5000,1"));
    expect(rows[0].description).toBeNull();
    expect(warnings.map((w) => w.field)).toEqual(["conditionNotes"]);
  });

  it("skips blank lines and ignores unknown columns with a warning", () => {
    const { rows, warnings } = parseProductCsv(csv("name,category,condition,price,quantity,colour\nA part,Filters,new,100,1,red\n,,,,,\n"));
    expect(rows).toHaveLength(1);
    expect(warnings[0].message).toMatch(/colour/);
  });
});
