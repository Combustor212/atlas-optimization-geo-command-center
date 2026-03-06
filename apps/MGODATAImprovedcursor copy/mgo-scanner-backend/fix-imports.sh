#!/bin/bash

# Fix MemberRole -> OrgMemberRole
find src -type f -name "*.ts" -exec sed -i '' 's/MemberRole/OrgMemberRole/g' {} +

# Fix organizationId -> orgId in specific contexts
find src/routes src/middleware -type f -name "*.ts" -exec sed -i '' 's/organizationId_userId/orgId_userId/g' {} +

# Fix subscription status enums
find src -type f -name "*.ts" -exec sed -i '' "s/status: { in: \['active', 'trialing'\]/status: { in: \['ACTIVE', 'TRIALING'\]/g" {} +
find src -type f -name "*.ts" -exec sed -i '' "s/status === 'active'/status === 'ACTIVE'/g" {} +
find src -type f -name "*.ts" -exec sed -i '' "s/status === 'trialing'/status === 'TRIALING'/g" {} +

echo "✅ Import fixes applied"



