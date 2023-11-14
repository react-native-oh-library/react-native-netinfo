#include "RNOH/Package.h"
#include "RNCNetInfoTurboModule.h"

using namespace rnoh;
using namespace facebook;
class RNCNetInfoFactoryDelegate : public TurboModuleFactoryDelegate
{
public:
    SharedTurboModule createTurboModule(Context ctx, const std::string &name) const override
    {
        if (name == "RNCNetInfo")
        {
            return std::make_shared<RNCNetInfoTurboModule>(ctx, name);
        }
        return nullptr;
    };
};
namespace rnoh
{
    class RNCNetInfoPackage : public Package
    {
    public:
        RNCNetInfoPackage(Package::Context ctx) : Package(ctx) {}
        std::unique_ptr<TurboModuleFactoryDelegate> createTurboModuleFactoryDelegate() override
        {
            return std::make_unique<RNCNetInfoFactoryDelegate>();
        }
    };
} // namespace rnoh