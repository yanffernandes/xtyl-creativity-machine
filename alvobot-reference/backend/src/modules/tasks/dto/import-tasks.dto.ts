import { IsNumber, IsString, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ImportTasksDto {
  @ApiProperty({
    description: "ID do projeto para associar as tarefas",
    example: 1,
  })
  @IsNumber()
  project_id: number;

  @ApiProperty({
    description: "Fase para importar tarefas",
    enum: ["seu_blog_no_ar", "mineracao", "escala"],
    example: "seu_blog_no_ar",
  })
  @IsString()
  @IsIn(["seu_blog_no_ar", "mineracao", "escala"])
  phase: "seu_blog_no_ar" | "mineracao" | "escala";
}
