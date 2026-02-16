import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceRoleGuard } from "./guards/workspace-role.guard";

@Module({
  imports: [ConfigModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceRoleGuard],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
