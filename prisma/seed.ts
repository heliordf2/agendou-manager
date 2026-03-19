import { PrismaClient } from "@prisma/client";
import snapshotData from "./seed-data.snapshot.json" with { type: "json" };

const prisma = new PrismaClient();

type Snapshot = {
  generatedAt: string;
  counts: Record<string, number>;
  comercios: any[];
};

const snapshot = snapshotData as Snapshot;

const toDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value);
};

async function upsertComercio(comercio: any) {
  await prisma.comercio.upsert({
    where: { id: comercio.id },
    update: {
      name: comercio.name,
      slug: comercio.slug,
      description: comercio.description,
      avatarImageUrl: comercio.avatarImageUrl,
      coverImageUrl: comercio.coverImageUrl,
      phone: comercio.phone,
      ativo: comercio.ativo,
      plan: comercio.plan,
    },
    create: {
      id: comercio.id,
      name: comercio.name,
      slug: comercio.slug,
      description: comercio.description,
      avatarImageUrl: comercio.avatarImageUrl,
      coverImageUrl: comercio.coverImageUrl,
      phone: comercio.phone,
      ativo: comercio.ativo,
      plan: comercio.plan,
      createdAt: toDate(comercio.createdAt) ?? undefined,
      updateAt: toDate(comercio.updateAt) ?? undefined,
    },
  });
}

async function upsertUsers(comercio: any) {
  for (const user of comercio.users ?? []) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        password: user.password,
        name: user.name,
        comercioId: user.comercioId,
        emailVerified: user.emailVerified,
        verificationToken: user.verificationToken,
        verificationTokenExpiry: toDate(user.verificationTokenExpiry),
        resetToken: user.resetToken,
        resetTokenExpiry: toDate(user.resetTokenExpiry),
      },
      create: {
        id: user.id,
        email: user.email,
        password: user.password,
        name: user.name,
        comercioId: user.comercioId,
        emailVerified: user.emailVerified,
        verificationToken: user.verificationToken,
        verificationTokenExpiry: toDate(user.verificationTokenExpiry),
        resetToken: user.resetToken,
        resetTokenExpiry: toDate(user.resetTokenExpiry),
        createdAt: toDate(user.createdAt) ?? undefined,
        updatedAt: toDate(user.updatedAt) ?? undefined,
      },
    });
  }
}

async function upsertCategoriesAndProducts(comercio: any) {
  for (const category of comercio.menuCategory ?? []) {
    await prisma.menuCategory.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        order: category.order,
        comercioId: category.comercioId,
      },
      create: {
        id: category.id,
        name: category.name,
        order: category.order,
        comercioId: category.comercioId,
        createdAt: toDate(category.createdAt) ?? undefined,
        updateAt: toDate(category.updateAt) ?? undefined,
      },
    });

    for (const product of category.product ?? []) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          comercioId: product.comercioId,
          menuCategoryId: product.menuCategoryId,
        },
        create: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          comercioId: product.comercioId,
          menuCategoryId: product.menuCategoryId,
          createdAt: toDate(product.createdAt) ?? undefined,
          updateAt: toDate(product.updateAt) ?? undefined,
        },
      });
    }
  }
}

async function upsertProfessionals(comercio: any) {
  for (const profissional of comercio.profissionais ?? []) {
    await prisma.profissional.upsert({
      where: { id: profissional.id },
      update: {
        name: profissional.name,
        avatarImageUrl: profissional.avatarImageUrl,
        email: profissional.email,
        phone: profissional.phone,
        description: profissional.description,
        isActive: profissional.isActive,
        comercioId: profissional.comercioId,
      },
      create: {
        id: profissional.id,
        name: profissional.name,
        avatarImageUrl: profissional.avatarImageUrl,
        email: profissional.email,
        phone: profissional.phone,
        description: profissional.description,
        isActive: profissional.isActive,
        comercioId: profissional.comercioId,
        createdAt: toDate(profissional.createdAt) ?? undefined,
        updatedAt: toDate(profissional.updatedAt) ?? undefined,
      },
    });

    for (const agenda of profissional.agendas ?? []) {
      await prisma.agendaProfissional.upsert({
        where: { id: agenda.id },
        update: {
          profissionalId: agenda.profissionalId,
          dayOfWeek: agenda.dayOfWeek,
          startTime: agenda.startTime,
          endTime: agenda.endTime,
          slotDuration: agenda.slotDuration,
          isActive: agenda.isActive,
          serviceId: agenda.serviceId,
        },
        create: {
          id: agenda.id,
          profissionalId: agenda.profissionalId,
          dayOfWeek: agenda.dayOfWeek,
          startTime: agenda.startTime,
          endTime: agenda.endTime,
          slotDuration: agenda.slotDuration,
          isActive: agenda.isActive,
          serviceId: agenda.serviceId,
          createdAt: toDate(agenda.createdAt) ?? undefined,
          updatedAt: toDate(agenda.updatedAt) ?? undefined,
        },
      });

      for (const bloqueio of agenda.bloqueios ?? []) {
        await prisma.bloqueoProfissional.upsert({
          where: { id: bloqueio.id },
          update: {
            agendaId: bloqueio.agendaId,
            startTime: bloqueio.startTime,
            endTime: bloqueio.endTime,
            motivo: bloqueio.motivo,
          },
          create: {
            id: bloqueio.id,
            agendaId: bloqueio.agendaId,
            startTime: bloqueio.startTime,
            endTime: bloqueio.endTime,
            motivo: bloqueio.motivo,
            createdAt: toDate(bloqueio.createdAt) ?? undefined,
            updatedAt: toDate(bloqueio.updatedAt) ?? undefined,
          },
        });
      }
    }

    for (const relation of profissional.services ?? []) {
      await prisma.profissionalProduct.upsert({
        where: { id: relation.id },
        update: {
          profissionalId: relation.profissionalId,
          productId: relation.productId,
        },
        create: {
          id: relation.id,
          profissionalId: relation.profissionalId,
          productId: relation.productId,
          createdAt: toDate(relation.createdAt) ?? undefined,
          updatedAt: toDate(relation.updatedAt) ?? undefined,
        },
      });
    }
  }
}

async function upsertBusinessHours(comercio: any) {
  for (const hour of comercio.businessHours ?? []) {
    await prisma.businessHours.upsert({
      where: { id: hour.id },
      update: {
        comercioId: hour.comercioId,
        dayOfWeek: hour.dayOfWeek,
        startTime: hour.startTime,
        endTime: hour.endTime,
        slotDuration: hour.slotDuration,
        isActive: hour.isActive,
      },
      create: {
        id: hour.id,
        comercioId: hour.comercioId,
        dayOfWeek: hour.dayOfWeek,
        startTime: hour.startTime,
        endTime: hour.endTime,
        slotDuration: hour.slotDuration,
        isActive: hour.isActive,
        createdAt: toDate(hour.createdAt) ?? undefined,
        updatedAt: toDate(hour.updatedAt) ?? undefined,
      },
    });

    for (const blocked of hour.blockedSlots ?? []) {
      await prisma.blockedTimeSlot.upsert({
        where: { id: blocked.id },
        update: {
          businessHoursId: blocked.businessHoursId,
          startTime: blocked.startTime,
          endTime: blocked.endTime,
          reason: blocked.reason,
        },
        create: {
          id: blocked.id,
          businessHoursId: blocked.businessHoursId,
          startTime: blocked.startTime,
          endTime: blocked.endTime,
          reason: blocked.reason,
          createdAt: toDate(blocked.createdAt) ?? undefined,
          updatedAt: toDate(blocked.updatedAt) ?? undefined,
        },
      });
    }
  }
}

async function upsertOrders(comercio: any) {
  for (const order of comercio.order ?? []) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {
        total: order.total,
        status: order.status,
        comercioId: order.comercioId,
        profissionalId: order.profissionalId,
        customerName: order.customerName,
        customerCellPhone: order.customerCellPhone,
        scheduledDate: order.scheduledDate,
        scheduledTime: order.scheduledTime,
      },
      create: {
        id: order.id,
        total: order.total,
        status: order.status,
        comercioId: order.comercioId,
        profissionalId: order.profissionalId,
        customerName: order.customerName,
        customerCellPhone: order.customerCellPhone,
        scheduledDate: order.scheduledDate,
        scheduledTime: order.scheduledTime,
        createdAt: toDate(order.createdAt) ?? undefined,
        updateAt: toDate(order.updateAt) ?? undefined,
      },
    });

    for (const item of order.orderProducts ?? []) {
      await prisma.orderProduct.upsert({
        where: { id: item.id },
        update: {
          productId: item.productId,
          orderId: item.orderId,
          quantity: item.quantity,
          price: item.price,
        },
        create: {
          id: item.id,
          productId: item.productId,
          orderId: item.orderId,
          quantity: item.quantity,
          price: item.price,
          createdAt: toDate(item.createdAt) ?? undefined,
          updateAt: toDate(item.updateAt) ?? undefined,
        },
      });
    }
  }
}

async function main() {
  console.log("🌱 Seed baseado em snapshot do banco");
  console.log(`📦 Snapshot gerado em: ${snapshot.generatedAt}`);
  console.log("ℹ️ Este seed não apaga dados existentes. Ele faz upsert por ID.");

  for (const comercio of snapshot.comercios) {
    await upsertComercio(comercio);
    await upsertUsers(comercio);
    await upsertCategoriesAndProducts(comercio);
    await upsertProfessionals(comercio);
    await upsertBusinessHours(comercio);
    await upsertOrders(comercio);
    console.log(`✅ Sincronizado: ${comercio.name}`);
  }

  console.log("\n📊 Contagens do snapshot:");
  for (const [key, value] of Object.entries(snapshot.counts)) {
    console.log(`- ${key}: ${value}`);
  }

  console.log("✅ Seed finalizado");
}

main()
  .catch((error) => {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
