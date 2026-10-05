@AnalyzeClasses(packages = "com.company.project", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule layering = layeredArchitecture().consideringAllDependencies()
        .layer("Controller").definedBy("..controller..")
        .layer("Service").definedBy("..service..")
        .layer("Repository").definedBy("..repository..")
        .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
        .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
        .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service");

    @ArchTest
    static final ArchRule controllersDoNotTouchRepositories =
        noClasses().that().resideInAPackage("..controller..")
            .should().dependOnClassesThat().resideInAPackage("..repository..")
            .because("a controller must never inject a repository (standard 2)");

    @ArchTest
    static final ArchRule entitiesDoNotLeave =
        noMethods().that().areDeclaredInClassesThat().resideInAPackage("..controller..")
            .should().haveRawReturnType(resideInAPackage("..entity.."))
            .because("returning an entity makes every column public API (standard 2)");

    @ArchTest
    static final ArchRule noFieldInjection =
        noFields().should().beAnnotatedWith(Autowired.class)
            .because("constructor injection only (standard 10)");

    @ArchTest
    static final ArchRule noTryCatchInControllers =
        noClasses().that().resideInAPackage("..controller..")
            .should().callMethodWhere(target(nameMatching("printStackTrace")))
            .because("errors go through the advice (standard 3)");

    @ArchTest
    static final ArchRule transactionalOnServicesOnly =
        methods().that().areAnnotatedWith(Transactional.class)
            .should().beDeclaredInClassesThat().resideInAPackage("..service..")
            .andShould().bePublic()
            .because("a non-public or controller @Transactional fails silently (standard 13.2)");

    @ArchTest
    static final ArchRule noFloatMoney =
        noFields().that().haveNameMatching(".*([Aa]mount|[Pp]rice|[Bb]alance|[Ff]ee|[Tt]otal).*")
            .should().haveRawType(double.class).orShould().haveRawType(float.class)
            .because("money is long minor units (standard 12)");

    @ArchTest
    static final ArchRule noUtilClasses =
        noClasses().should().haveSimpleNameEndingWith("Util")
            .orShould().haveSimpleNameEndingWith("Helper")
            .orShould().haveSimpleNameEndingWith("Manager")
            .because("they become the place nobody wants to open (standard 11)");
}
