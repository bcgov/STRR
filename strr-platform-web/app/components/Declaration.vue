<template>
  <div data-testid="declaration" class="space-y-2">
    <p>
      {{ $t('createAccount.review.declarationPartOne') }}
    </p>
    <div class="pl-3">
      <div class="flex gap-2">
        <p class="font-bold">
          a.
        </p>
        <p>{{ $t('createAccount.review.declarationA') }}</p>
      </div>
      <div class="flex gap-2">
        <p class="font-bold">
          b.
        </p>
        <p>{{ $t('createAccount.review.declarationB') }}</p>
      </div>
    </div>
    <p>
      {{ $t('createAccount.review.declarationPartTwo') }}
    </p>
  </div>
</template>
