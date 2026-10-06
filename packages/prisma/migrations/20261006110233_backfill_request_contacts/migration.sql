-- Requests made before guests were allowed belong to an account: copy that
-- account's name/phone/email onto the request so the admin can reach them.
UPDATE "product_requests" pr
SET "contactName"  = COALESCE(pr."contactName", u."firstName" || ' ' || u."lastName"),
    "contactPhone" = COALESCE(pr."contactPhone", u."phone", u."defaultShippingPhone"),
    "contactEmail" = COALESCE(pr."contactEmail", u."email")
FROM "users" u
WHERE pr."userId" = u."id";
