/**
 * @jest-environment node
 */
import { prisma } from "@/lib/prisma";
import { cleanupExpiredGuests } from "@/lib/scheduler";

describe("Guest User Expiration", () => {
  const guestEmail = `guest-test-${Date.now()}@leadguard.local`;
  let guestUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: guestEmail,
        password: "test-password",
        name: "Guest",
        apiKey: `lg_test_${Date.now()}`,
        guestExpiresAt: new Date(Date.now() + 60 * 1000), // 1 minute from now
      },
    });
    guestUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: guestUserId } }).catch(() => {});
  });

  it("creates guest user with expiration", async () => {
    const user = await prisma.user.findUnique({ where: { id: guestUserId } });
    expect(user).not.toBeNull();
    expect(user?.guestExpiresAt).not.toBeNull();
    expect(user?.email).toMatch(/@leadguard\.local$/);
  });

  it("cleanupExpiredGuests removes expired guest users", async () => {
    // Create an expired guest user
    const expiredEmail = `guest-expired-${Date.now()}@leadguard.local`;
    const expiredUser = await prisma.user.create({
      data: {
        email: expiredEmail,
        password: "test-password",
        name: "Guest",
        apiKey: `lg_test_${Date.now()}`,
        guestExpiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      },
    });

    const deletedCount = await cleanupExpiredGuests();
    expect(deletedCount).toBeGreaterThanOrEqual(1);

    const deleted = await prisma.user.findUnique({ where: { id: expiredUser.id } });
    expect(deleted).toBeNull();
  });

  it("cleanupExpiredGuests does not remove non-expired guests", async () => {
    const validEmail = `guest-valid-${Date.now()}@leadguard.local`;
    const validUser = await prisma.user.create({
      data: {
        email: validEmail,
        password: "test-password",
        name: "Guest",
        apiKey: `lg_test_${Date.now()}`,
        guestExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      },
    });

    const deletedCount = await cleanupExpiredGuests();
    // Should not delete the valid user
    const user = await prisma.user.findUnique({ where: { id: validUser.id } });
    expect(user).not.toBeNull();

    // Clean up
    await prisma.user.delete({ where: { id: validUser.id } }).catch(() => {});
  });

  it("cleanupExpiredGuests does not remove regular users", async () => {
    const regularEmail = `regular-${Date.now()}@example.com`;
    const regularUser = await prisma.user.create({
      data: {
        email: regularEmail,
        password: "test-password",
        name: "Regular User",
        apiKey: `lg_test_${Date.now()}`,
        guestExpiresAt: new Date(Date.now() - 60 * 1000), // expired but not a guest
      },
    });

    const deletedCount = await cleanupExpiredGuests();
    const user = await prisma.user.findUnique({ where: { id: regularUser.id } });
    expect(user).not.toBeNull();

    // Clean up
    await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
  });
});
