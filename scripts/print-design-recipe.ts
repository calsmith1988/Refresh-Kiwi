// One-off sanity check: prints the assigned design recipe for sample slugs,
// plus the full prompt section for the first one. Run with:
//   npx tsx scripts/print-design-recipe.ts [slug ...]
import {
  buildDesignRecipeSection,
  pickDesignRecipe,
} from "../lib/cursor/design-directions";

const slugs =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [
        "crispandclean",
        "wentworthandjeffries",
        "imagesmilesdental",
        "buildermerthyrtydfil",
        "premiernd",
        "honestplumbers",
        "acme-electrical",
        "greenleaf-gardens",
      ];

for (const slug of slugs) {
  const recipe = pickDesignRecipe(slug);
  console.log(
    `${slug.padEnd(24)} direction=${recipe.direction.name.padEnd(18)} hero=${recipe.hero.name.padEnd(20)} fonts="${recipe.fonts.name}" colors=${recipe.colors.name}`,
  );
}

console.log("\n----- full section for first slug -----\n");
console.log(buildDesignRecipeSection(slugs[0]));
