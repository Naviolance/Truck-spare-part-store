import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateOrderDto } from "./create-order.dto";

const errors = (body: Record<string, unknown>) =>
  validateSync(plainToInstance(CreateOrderDto, body)).map((e) => e.property);

const valid = { shippingCity: "Douala", shippingPhone: "+237 654 43 26 41" };

describe("CreateOrderDto", () => {
  it("accepts an order without an address (parts are picked up in store)", () => {
    expect(errors(valid)).toEqual([]);
    expect(errors({ ...valid, shippingAddress: "" })).toEqual([]);
  });

  it("still accepts an address when one is given", () => {
    expect(errors({ ...valid, shippingAddress: "Akwa, rue Joss" })).toEqual([]);
  });

  it("requires the phone and the city", () => {
    expect(errors({ shippingCity: "Douala" })).toContain("shippingPhone");
    expect(errors({ shippingPhone: valid.shippingPhone })).toContain("shippingCity");
  });

  it("caps the address length", () => {
    expect(errors({ ...valid, shippingAddress: "x".repeat(301) })).toContain("shippingAddress");
  });
});
